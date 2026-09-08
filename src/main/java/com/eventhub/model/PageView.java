package com.eventhub.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "page_views")
public class PageView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String type;

    @Column(name = "event_id")
    private Long eventId;

    @Column(name = "session_id", nullable = false, length = 80)
    private String sessionId;

    @Column(name = "viewed_at", nullable = false)
    private LocalDateTime viewedAt;

    public PageView() {
    }

    public PageView(String type, Long eventId, String sessionId) {
        this.type = type;
        this.eventId = eventId;
        this.sessionId = sessionId;
        this.viewedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getEventId() {
        return eventId;
    }

    public void setEventId(Long eventId) {
        this.eventId = eventId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public LocalDateTime getViewedAt() {
        return viewedAt;
    }
}