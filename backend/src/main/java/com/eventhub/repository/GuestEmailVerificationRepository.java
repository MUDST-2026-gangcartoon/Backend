package com.eventhub.repository;

import com.eventhub.model.GuestEmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GuestEmailVerificationRepository extends JpaRepository<GuestEmailVerification, Long> {}
