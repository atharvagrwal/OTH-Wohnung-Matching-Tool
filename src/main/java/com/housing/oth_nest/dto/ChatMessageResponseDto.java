package com.housing.oth_nest.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageResponseDto {
    private String id;
    private String chatId;
    private String senderId;
    private String senderName;
    private String content;
    private boolean isRead;
    private String sentAt;
}