package com.housing.oth_nest.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.support.email:support@example.com}")
    private String supportEmail;

    @Value("${spring.mail.from:noreply@example.com}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Transactional
    public void sendReportEmail(String reporterName, String reportedUserName, String description) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(supportEmail);
        message.setSubject("User Report: " + reportedUserName);
        message.setText(buildEmailBody(reporterName, reportedUserName, description));

        try {
            mailSender.send(message);
        } catch (Exception e) {
            // Log the error, but don't fail the application
            System.err.println("Failed to send report email: " + e.getMessage());
        }
    }

    private String buildEmailBody(String reporterName, String reportedUserName, String description) {
        return "User Report\n" +
                "============\n\n" +
                "Reported By: " + reporterName + "\n" +
                "Reported User: " + reportedUserName + "\n\n" +
                "Description:\n" +
                description;
    }
}
