package com.eventhub.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class DetailImage {

    @Column(nullable = false, length = 2000)
    private String url;

    @Column(nullable = false, length = 24)
    private String placement;

    public DetailImage() {
    }

    public DetailImage(String url, String placement) {
        this.url = url;
        this.placement = placement;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getPlacement() {
        return placement;
    }

    public void setPlacement(String placement) {
        this.placement = placement;
    }
}