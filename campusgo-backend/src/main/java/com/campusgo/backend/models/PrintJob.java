package com.campusgo.backend.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "print_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrintJob extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    // After order is placed, linked to that order
    @Column(name = "order_id")
    private Long orderId;

    // Original file name for display
    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    // Stored filename on disk (UUID-based, encrypted)
    @Column(name = "stored_filename", nullable = false)
    @JsonIgnore
    private String storedFilename;

    // Number of pages in the document (0 = unknown/not yet counted)
    @Column(name = "page_count")
    @Builder.Default
    private Integer pageCount = 0;

    // COLOR or BW
    @Column(name = "color_mode", nullable = false)
    @Builder.Default
    private String colorMode = "BW"; // BW | COLOR

    @Column(name = "copies", nullable = false)
    @Builder.Default
    private Integer copies = 1;

    // Computed cost (pages × pricePerPage × copies)
    @Column(name = "printing_cost", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal printingCost = BigDecimal.ZERO;

    // Print workflow status
    // UPLOADED → PENDING → ACCEPTED → PRINTING → READY → COLLECTED
    @Column(name = "print_status", nullable = false)
    @Builder.Default
    private String printStatus = "UPLOADED";

    // Managers notes / rejection reason
    @Column(name = "manager_notes", columnDefinition = "TEXT")
    private String managerNotes;

    // File size in bytes for display
    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    // File MIME type
    @Column(name = "file_type")
    private String fileType;
}
