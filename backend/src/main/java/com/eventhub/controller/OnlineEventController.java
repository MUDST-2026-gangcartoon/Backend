package com.eventhub.controller;

import com.eventhub.service.OnlineEventService;
import java.security.Principal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class OnlineEventController {

  private final OnlineEventService service;

  public OnlineEventController(OnlineEventService service) {
    this.service = service;
  }

  @GetMapping("/api/admin/events/{id}/online-settings")
  public ResponseEntity<OnlineEventService.Settings> settings(
    @PathVariable Long id
  ) {
    return ResponseEntity.ok()
      .cacheControl(org.springframework.http.CacheControl.noStore())
      .body(service.settings(id));
  }

  @GetMapping("/api/events/{id}/online-access")
  public ResponseEntity<OnlineEventService.Access> access(
    @PathVariable Long id,
    Principal principal
  ) {
    return ResponseEntity.ok()
      .cacheControl(org.springframework.http.CacheControl.noStore())
      .body(service.access(id, principal));
  }

  @PostMapping("/api/events/{id}/online-join")
  public ResponseEntity<OnlineEventService.Joined> join(
    @PathVariable Long id,
    Principal principal
  ) {
    return ResponseEntity.ok()
      .cacheControl(org.springframework.http.CacheControl.noStore())
      .body(service.join(id, principal));
  }
}
