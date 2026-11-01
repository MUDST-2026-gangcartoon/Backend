package com.eventhub.service;

import com.eventhub.model.UserAccount;
import com.eventhub.repository.UserRepository;
import java.security.Principal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Service signatures for QA to target; no profile/password mutations in skeleton.
 */
@Service
public class ProfileService {

    public ProfileService(UserRepository users, PasswordEncoder encoder) {}

    public UserAccount update(
        Principal principal, String name, String email, String currentPassword
    ) {
        throw new UnsupportedOperationException("Profile update pending QA tests");
    }

    public UserAccount password(
        Principal principal, String currentPassword, String newPassword
    ) {
        throw new UnsupportedOperationException("Password update pending QA tests");
    }
}
