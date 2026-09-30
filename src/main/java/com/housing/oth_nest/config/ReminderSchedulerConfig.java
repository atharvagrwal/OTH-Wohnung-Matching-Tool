package com.housing.oth_nest.config;

import com.housing.oth_nest.model.Notification;
import com.housing.oth_nest.model.Offer;
import com.housing.oth_nest.model.NotificationType;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.repository.NotificationRepository;
import com.housing.oth_nest.service.OfferService;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@EnableScheduling
public class ReminderSchedulerConfig {

    private final OfferService offerService;
    private final NotificationRepository notificationRepository;

    public ReminderSchedulerConfig(OfferService offerService, NotificationRepository notificationRepository) {
        this.offerService = offerService;
        this.notificationRepository = notificationRepository;
    }

    /**
     * Runs daily at 00:00 UTC.
     * Finds offers where availableFrom == today and no OFFERED application exists.
     * Sends a reminder notification to the owner.
     * Records reminderSentAt timestamp to track that reminder was already sent.
     */
    @Scheduled(cron = "0 0 0 * * *", zone = "UTC") // Daily at 00:00 UTC
    @Transactional
    public void sendMoveInDateReminders() {
        List<Offer> reminderCandidates = offerService.getReminderCandidates();

        for (Offer offer : reminderCandidates) {
            // Check if reminder was already sent today
            if (offer.getReminderSentAt() != null && 
                offer.getReminderSentAt().toLocalDate().equals(LocalDateTime.now().toLocalDate())) {
                continue;
            }

            User owner = offer.getOwner();
            if (owner != null) {
                Notification notification = new Notification();
                notification.setRecipient(owner);
                notification.setType(NotificationType.REMINDER);
                notification.setTitle("Move-in Date Reminder");
                notification.setMessage("Your offer \"" + offer.getApartment().getTitle() + 
                        "\" has a move-in date of today. Please respond to applicants or the offer will expire in 7 days.");
                notification.setApplicationId(null);
                notification.setOfferId(offer.getId());

                notificationRepository.save(notification);

                // Mark reminder as sent
                offerService.markReminderSent(offer.getId());
            }
        }
    }
}
