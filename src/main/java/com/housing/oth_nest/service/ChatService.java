package com.housing.oth_nest.service;

import com.housing.oth_nest.dto.ChatMessageResponseDto;
import com.housing.oth_nest.dto.ChatResponseDto;
import com.housing.oth_nest.dto.DtoMapper;
import com.housing.oth_nest.dto.SendMessageRequestDto;
import com.housing.oth_nest.exception.ResourceNotFoundException;
import com.housing.oth_nest.model.Application;
import com.housing.oth_nest.model.Chat;
import com.housing.oth_nest.model.ChatMessage;
import com.housing.oth_nest.model.User;
import com.housing.oth_nest.repository.ApplicationRepository;
import com.housing.oth_nest.repository.ChatMessageRepository;
import com.housing.oth_nest.repository.ChatRepository;
import com.housing.oth_nest.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ChatService {

    private final ChatRepository chatRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;

    public ChatService(
            ChatRepository chatRepository,
            ChatMessageRepository chatMessageRepository,
            ApplicationRepository applicationRepository,
            UserRepository userRepository) {
        this.chatRepository = chatRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
    }

    //retrieves existing chat or creates a new one for a given application
    @Transactional
    public Chat createOrGetChatForApplication(Long applicationId) {
        return chatRepository.findByApplication_Id(applicationId).orElseGet(() -> {
            Application application = applicationRepository.findWithDetailsById(applicationId)
                    .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));

            Chat chat = Chat.builder()
                    .application(application)
                    .offer(application.getOffer())
                    .owner(application.getOffer().getOwner())
                    .applicant(application.getApplicant())
                    .build();

            return chatRepository.save(chat);
        });
    }

    //retrieves all chats for a given user, along with their messages and unread message count
    public List<ChatResponseDto> getUserChats(Long userId) {
        List<Chat> chats = chatRepository.findByOwner_IdOrApplicant_IdOrderByCreatedAtDesc(userId, userId);

        return chats.stream().map(chat -> {
            List<ChatMessage> messages = chatMessageRepository.findByChat_IdOrderBySentAtAsc(chat.getId());
            long unread = chatMessageRepository.countByChat_IdAndSender_IdNotAndIsReadFalse(chat.getId(), userId);
            return DtoMapper.toChatResponse(chat, messages, unread);
        }).toList();
    }

    //sends a message in a chat and returns the saved message
    @Transactional
    public ChatMessageResponseDto sendMessage(Long chatId, SendMessageRequestDto request) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat not found: " + chatId));

        User sender = userRepository.findById(request.getSenderId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getSenderId()));

        ChatMessage message = ChatMessage.builder()
                .chat(chat)
                .sender(sender)
                .content(request.getContent())
                .isRead(false)
                .build();

        message = chatMessageRepository.save(message);
        return DtoMapper.toChatMessageResponse(message);
    }

    @Transactional
    public void markMessagesAsRead(Long chatId, Long currentUserId) {
        List<ChatMessage> unreadMessages = chatMessageRepository
                .findByChat_IdAndSender_IdNotAndIsReadFalse(chatId, currentUserId);
        unreadMessages.forEach(msg -> msg.setRead(true));
        chatMessageRepository.saveAll(unreadMessages);
    }
}