package com.eventhub.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 2000)
    private String description;

    @Column(nullable = false)
    private String location;

    @Column(name = "starts_at", nullable = false)
    private LocalDateTime startsAt;

    @Column(nullable = false)
    private int capacity;

    @Column(nullable = false, length = 40)
    private String category = "COMMUNITY";

    @Column(name = "image_url", length = 2000)
    private String imageUrl;

    @Column(name = "detail_image_url", length = 2000)
    private String detailImageUrl;

    @ElementCollection
    @CollectionTable(
            name = "event_detail_images",
            joinColumns = @JoinColumn(name = "event_id")
    )
    @OrderColumn(name = "display_order")
    private List<DetailImage> detailImages = new ArrayList<>();

    @OneToMany(
            mappedBy = "event",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @OrderBy("id ASC")
    private List<TicketType> ticketTypes = new ArrayList<>();

    public Event() {
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public LocalDateTime getStartsAt() {
        return startsAt;
    }

    public void setStartsAt(LocalDateTime startsAt) {
        this.startsAt = startsAt;
    }

    public int getCapacity() {
        return capacity;
    }

    public void setCapacity(int capacity) {
        this.capacity = capacity;
    }

    public String getCategory() {
        if (category == null || category.isBlank()) {
            return "COMMUNITY";
        }
        return category;
    }

    public void setCategory(String category) {
        if (category == null || category.isBlank()) {
            this.category = "COMMUNITY";
        } else {
            this.category = category.trim();
        }
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            this.imageUrl = null;
        } else {
            this.imageUrl = imageUrl.trim();
        }
    }

    public String getDetailImageUrl() {
        return detailImageUrl;
    }

    public void setDetailImageUrl(String detailImageUrl) {
        this.detailImageUrl = detailImageUrl;
    }

    public List<DetailImage> getDetailImages() {
        return detailImages;
    }

    public void setDetailImages(List<DetailImage> detailImages) {
        this.detailImages.clear();

        if (detailImages != null) {
            this.detailImages.addAll(detailImages);
        }
    }

    public List<TicketType> getTicketTypes() {
        return ticketTypes;
    }

    public void setTicketTypes(List<TicketType> ticketTypes) {
        this.ticketTypes.clear();

        if (ticketTypes != null) {
            for (TicketType ticketType : ticketTypes) {
                ticketType.setEvent(this);
                this.ticketTypes.add(ticketType);
            }
        }
    }

    public void addTicketType(TicketType ticketType) {
        ticketType.setEvent(this);
        this.ticketTypes.add(ticketType);
    }
}