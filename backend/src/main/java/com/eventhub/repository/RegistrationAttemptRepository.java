package com.eventhub.repository;

import java.util.UUID;

import com.eventhub.model.RegistrationAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegistrationAttemptRepository extends JpaRepository<RegistrationAttempt, UUID> {}
