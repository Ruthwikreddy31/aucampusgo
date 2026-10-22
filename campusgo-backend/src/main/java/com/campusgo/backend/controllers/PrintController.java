package com.campusgo.backend.controllers;

import com.campusgo.backend.models.*;
import com.campusgo.backend.repositories.*;
import com.campusgo.backend.security.UserDetailsImpl;
import com.campusgo.backend.services.NotificationService;
import com.campusgo.backend.services.PrintStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

/**
 * PrintController – handles print document uploads, quote calculation, manager
 * workflow (accept/printing/ready), and secure file download.
 *
 * Endpoints:
 *   POST   /api/print/upload          – student uploads a file and receives a PrintJob id + quote
 *   GET    /api/print/quote           – recalculate quote for given params
 *   GET    /api/print/my             – list student's own print jobs
 *   GET    /api/print/{id}/download   – download the document (student / manager / admin only)
 *   GET    /api/print/manager        – manager: list all PENDING print jobs
 *   POST   /api/print/{id}/status     – manager: update print status
 *   GET    /api/print/settings        – get configurable print prices
 */
@RestController
@RequestMapping("/api/print")
@RequiredArgsConstructor
@Slf4j
public class PrintController {

    private final PrintStorageService printStorageService;
    private final PrintJobRepository printJobRepository;
    private final UserRepository userRepository;
    private final CampusSettingRepository campusSettingRepository;
    private final ShopRepository shopRepository;
    private final NotificationService notificationService;

    // ─── Setting keys ───────────────────────────────────────────────────────
    private static final String KEY_BW_PRICE    = "print.bw.price_per_page";
    private static final String KEY_COLOR_PRICE = "print.color.price_per_page";
    private static final BigDecimal DEFAULT_BW_PRICE    = new BigDecimal("2.00");
    private static final BigDecimal DEFAULT_COLOR_PRICE = new BigDecimal("5.00");

    // ─── Helpers ────────────────────────────────────────────────────────────

    private BigDecimal getSetting(String key, BigDecimal fallback) {
        return campusSettingRepository.findBySettingKey(key)
                .map(s -> {
                    try { return new BigDecimal(s.getSettingValue()); }
                    catch (NumberFormatException e) { return fallback; }
                })
                .orElse(fallback);
    }

    private BigDecimal computeCost(int pages, String colorMode, int copies) {
        BigDecimal pricePerPage = "COLOR".equalsIgnoreCase(colorMode)
                ? getSetting(KEY_COLOR_PRICE, DEFAULT_COLOR_PRICE)
                : getSetting(KEY_BW_PRICE, DEFAULT_BW_PRICE);
        return pricePerPage
                .multiply(BigDecimal.valueOf(pages))
                .multiply(BigDecimal.valueOf(copies))
                .setScale(2, RoundingMode.HALF_UP);
    }

    // ─── Public settings endpoint (for checkout quote display) ───────────────

    @GetMapping("/settings")
    public ResponseEntity<?> getPrintSettings() {
        return ResponseEntity.ok(Map.of(
                "bwPricePerPage",    getSetting(KEY_BW_PRICE,    DEFAULT_BW_PRICE),
                "colorPricePerPage", getSetting(KEY_COLOR_PRICE, DEFAULT_COLOR_PRICE),
                "maxFileSizeMB",     printStorageService.getMaxFileSizeBytes() / (1024 * 1024)
        ));
    }

    // ─── Quote endpoint ──────────────────────────────────────────────────────

    @GetMapping("/quote")
    public ResponseEntity<?> getQuote(
            @RequestParam int pages,
            @RequestParam(defaultValue = "BW") String colorMode,
            @RequestParam(defaultValue = "1") int copies) {
        if (pages <= 0 || copies <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "pages and copies must be positive"));
        }
        BigDecimal cost = computeCost(pages, colorMode, copies);
        return ResponseEntity.ok(Map.of(
                "pages", pages,
                "colorMode", colorMode,
                "copies", copies,
                "printingCost", cost
        ));
    }

    // ─── Upload ──────────────────────────────────────────────────────────────

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> uploadPrintFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "BW") String colorMode,
            @RequestParam(defaultValue = "1") int copies,
            @RequestParam(defaultValue = "0") int pageCount,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }
        if (copies < 1) copies = 1;
        if (!colorMode.equalsIgnoreCase("COLOR") && !colorMode.equalsIgnoreCase("BW")) {
            colorMode = "BW";
        }

        User user = userRepository.findById(userDetails.getId()).orElseThrow();

        String storedFilename;
        try {
            storedFilename = printStorageService.storeFile(file);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to store print file for user {}: {}", userDetails.getId(), e.getMessage());
            return ResponseEntity.status(500).body(Map.of("message", "File upload failed. Please try again."));
        }

        int finalPageCount = Math.max(0, pageCount);
        BigDecimal cost = finalPageCount > 0 ? computeCost(finalPageCount, colorMode, copies) : BigDecimal.ZERO;

        PrintJob printJob = PrintJob.builder()
                .user(user)
                .originalFilename(sanitizeFilename(file.getOriginalFilename()))
                .storedFilename(storedFilename)
                .colorMode(colorMode.toUpperCase())
                .copies(copies)
                .pageCount(finalPageCount)
                .printingCost(cost)
                .fileSizeBytes(file.getSize())
                .fileType(file.getContentType())
                .printStatus("UPLOADED")
                .build();

        PrintJob saved = printJobRepository.save(printJob);
        log.info("Print job {} created by user {}", saved.getId(), userDetails.getId());

        return ResponseEntity.ok(Map.of(
                "printJobId",       saved.getId(),
                "originalFilename", saved.getOriginalFilename(),
                "pageCount",        saved.getPageCount(),
                "colorMode",        saved.getColorMode(),
                "copies",           saved.getCopies(),
                "printingCost",     saved.getPrintingCost(),
                "printStatus",      saved.getPrintStatus(),
                "fileSizeBytes",    saved.getFileSizeBytes()
        ));
    }

    // ─── Update print job details (pageCount / copies / colorMode) ───────────

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> updatePrintJob(
            @PathVariable Long id,
            @RequestBody Map<String, Object> updates,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        PrintJob job = printJobRepository.findByIdAndUserId(id, userDetails.getId())
                .orElse(null);
        if (job == null) return ResponseEntity.notFound().build();
        if (!"UPLOADED".equals(job.getPrintStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot update a job that has already been submitted"));
        }

        if (updates.containsKey("pageCount")) {
            int pc = Integer.parseInt(String.valueOf(updates.get("pageCount")));
            job.setPageCount(Math.max(0, pc));
        }
        if (updates.containsKey("copies")) {
            int c = Integer.parseInt(String.valueOf(updates.get("copies")));
            job.setCopies(Math.max(1, c));
        }
        if (updates.containsKey("colorMode")) {
            String cm = String.valueOf(updates.get("colorMode")).toUpperCase();
            if (cm.equals("BW") || cm.equals("COLOR")) job.setColorMode(cm);
        }

        // Recalculate cost
        if (job.getPageCount() > 0) {
            job.setPrintingCost(computeCost(job.getPageCount(), job.getColorMode(), job.getCopies()));
        }

        printJobRepository.save(job);
        return ResponseEntity.ok(Map.of(
                "printJobId",    job.getId(),
                "pageCount",     job.getPageCount(),
                "colorMode",     job.getColorMode(),
                "copies",        job.getCopies(),
                "printingCost",  job.getPrintingCost()
        ));
    }

    // ─── Student: list own print jobs ────────────────────────────────────────

    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getMyPrintJobs(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<PrintJob> jobs = printJobRepository.findByUserIdOrderByCreatedAtDesc(userDetails.getId());
        return ResponseEntity.ok(jobs.stream().map(this::toDto));
    }

    // ─── Manager: list print jobs ─────────────────────────────────────────────

    @GetMapping("/manager")
    @PreAuthorize("hasAnyRole('MANAGER', 'STORE_STAFF', 'ADMIN')")
    public ResponseEntity<?> getManagerPrintJobs(
            @RequestParam(required = false) String status) {
        List<PrintJob> jobs = (status != null && !status.isBlank())
                ? printJobRepository.findByPrintStatusOrderByCreatedAtAsc(status.toUpperCase())
                : printJobRepository.findAll().stream()
                        .filter(j -> !j.getPrintStatus().equals("UPLOADED"))
                        .toList();
        return ResponseEntity.ok(jobs.stream().map(this::toManagerDto));
    }

    // ─── Manager: update status ───────────────────────────────────────────────

    @PostMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('MANAGER', 'STORE_STAFF', 'ADMIN')")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        PrintJob job = printJobRepository.findById(id).orElse(null);
        if (job == null) return ResponseEntity.notFound().build();

        String newStatus = body.getOrDefault("status", "").toUpperCase();
        List<String> validStatuses = List.of("PENDING", "ACCEPTED", "PRINTING", "READY", "REJECTED", "COLLECTED");
        if (!validStatuses.contains(newStatus)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid status: " + newStatus));
        }

        job.setPrintStatus(newStatus);
        if (body.containsKey("managerNotes")) {
            job.setManagerNotes(body.get("managerNotes"));
        }
        printJobRepository.save(job);

        // Notify the student
        String msg = switch (newStatus) {
            case "ACCEPTED"  -> "Your print request for " + job.getOriginalFilename() + " has been accepted.";
            case "PRINTING"  -> "Your document " + job.getOriginalFilename() + " is being printed now.";
            case "READY"     -> "Your printed document is ready for delivery!";
            case "REJECTED"  -> "Your print request for " + job.getOriginalFilename() + " was rejected. " +
                    (job.getManagerNotes() != null ? job.getManagerNotes() : "");
            case "COLLECTED" -> "Your printed document has been picked up by the delivery partner.";
            default          -> "Print job status updated to " + newStatus;
        };
        try {
            notificationService.notifyUser(
                    job.getUser().getId(), job.getOrderId(), "Print Update", msg, "PRINT_STATUS");
        } catch (Exception e) {
            log.warn("Could not send print status notification: {}", e.getMessage());
        }

        log.info("Print job {} status updated to {} by user {}", id, newStatus, userDetails.getId());
        return ResponseEntity.ok(toManagerDto(job));
    }

    // ─── Secure download ─────────────────────────────────────────────────────

    @GetMapping("/{id}/download")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Resource> downloadPrintFile(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        PrintJob job = printJobRepository.findById(id).orElse(null);
        if (job == null) return ResponseEntity.notFound().build();

        // Access control
        boolean isOwner   = job.getUser().getId().equals(userDetails.getId());
        boolean isManager = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER")
                        || a.getAuthority().equals("ROLE_STORE_STAFF")
                        || a.getAuthority().equals("ROLE_ADMIN"));

        if (!isOwner && !isManager) {
            return ResponseEntity.status(403).build();
        }

        Resource resource;
        try {
            resource = printStorageService.loadFileAsResource(job.getStoredFilename());
        } catch (Exception e) {
            log.error("Failed to load print file {}: {}", job.getStoredFilename(), e.getMessage());
            return ResponseEntity.status(500).build();
        }

        String contentType = job.getFileType() != null ? job.getFileType() : "application/octet-stream";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + job.getOriginalFilename() + "\"")
                .body(resource);
    }

    // ─── DTO helpers ─────────────────────────────────────────────────────────

    private Map<String, Object> toDto(PrintJob j) {
        return Map.of(
                "id",               j.getId(),
                "originalFilename", j.getOriginalFilename(),
                "pageCount",        j.getPageCount(),
                "colorMode",        j.getColorMode(),
                "copies",           j.getCopies(),
                "printingCost",     j.getPrintingCost(),
                "printStatus",      j.getPrintStatus(),
                "orderId",          j.getOrderId() != null ? j.getOrderId() : 0L,
                "createdAt",        j.getCreatedAt() != null ? j.getCreatedAt().toString() : "",
                "fileSizeBytes",    j.getFileSizeBytes() != null ? j.getFileSizeBytes() : 0L
        );
    }

    private Map<String, Object> toManagerDto(PrintJob j) {
        return Map.of(
                "id",               j.getId(),
                "originalFilename", j.getOriginalFilename(),
                "pageCount",        j.getPageCount(),
                "colorMode",        j.getColorMode(),
                "copies",           j.getCopies(),
                "printingCost",     j.getPrintingCost(),
                "printStatus",      j.getPrintStatus(),
                "orderId",          j.getOrderId() != null ? j.getOrderId() : 0L,
                "managerNotes",     j.getManagerNotes() != null ? j.getManagerNotes() : "",
                "createdAt",        j.getCreatedAt() != null ? j.getCreatedAt().toString() : ""
        );
    }

    private String sanitizeFilename(String name) {
        if (name == null) return "document";
        return name.replaceAll("[^a-zA-Z0-9._\\-]", "_");
    }
}
