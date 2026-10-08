package com.campusgo.backend.services;

import com.campusgo.backend.models.AppNotification;
import com.campusgo.backend.models.Role;
import com.campusgo.backend.models.User;
import com.campusgo.backend.repositories.AppNotificationRepository;
import com.campusgo.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final AppNotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ZestEventPublisher eventPublisher;

    public AppNotification notifyUser(Long userId, Long orderId, String title, String message, String type) {
        AppNotification saved = notificationRepository.save(AppNotification.builder()
                .userId(userId)
                .orderId(orderId)
                .title(title)
                .message(message)
                .type(type)
                .read(false)
                .build());
        eventPublisher.publishUserNotification(userId, saved);
        return saved;
    }

    public void notifyRole(Role role, Long orderId, String title, String message, String type) {
        List<User> users = userRepository.findByRole(role);
        for (User user : users) {
            notifyUser(user.getId(), orderId, title, message, type);
        }
    }

    public List<AppNotification> forUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public void markRead(Long id, Long userId) {
        notificationRepository.findById(id).ifPresent(n -> {
            if (n.getUserId().equals(userId)) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }

    public void markAllRead(Long userId) {
        List<AppNotification> items = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        items.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(items);
    }
}
