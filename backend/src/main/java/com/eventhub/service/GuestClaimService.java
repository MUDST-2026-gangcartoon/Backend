package com.eventhub.service;

import java.security.Principal;
import java.security.SecureRandom;
import java.util.Locale;

import com.eventhub.dto.GuestApiDtos;
import com.eventhub.model.GuestEmailVerification;
import com.eventhub.model.Role;
import com.eventhub.model.UserAccount;
import com.eventhub.repository.EventRepository;
import com.eventhub.repository.GuestEmailVerificationRepository;
import com.eventhub.repository.GuestIdentityRepository;
import com.eventhub.repository.RegistrationRepository;
import com.eventhub.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GuestClaimService {
    private final GuestIdentityRepository guests;
    private final GuestEmailVerificationRepository verification;
    private final UserRepository users;
    private final EventRepository events;
    private final RegistrationRepository registrations;
    private final GuestVerificationMailSender mailSender;
    private final PasswordEncoder encoder;
    private final GuestPhase2Clock clock;
    private final SecureRandom random = new SecureRandom();

    public GuestClaimService(GuestIdentityRepository guests, GuestEmailVerificationRepository verification,
            UserRepository users, EventRepository events, RegistrationRepository registrations,
            GuestVerificationMailSender mailSender, PasswordEncoder encoder, GuestPhase2Clock clock) {
        this.guests = guests;
        this.verification = verification;
        this.users = users;
        this.events = events;
        this.registrations = registrations;
        this.mailSender = mailSender;
        this.encoder = encoder;
        this.clock = clock;
    }

    @Transactional
    public void requestVerification(Principal principal) {
        UserAccount user = lockedUser(principal);
        var now = clock.now();
        var challenge = verification.findById(user.getId())
                .orElseGet(() -> new GuestEmailVerification(user.getId()));
        if (!challenge.canResend(now)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Wait 60 seconds between code requests");
        }
        String code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        String email = GuestPhase2Service.normalizeEmail(user.getEmail());
        challenge.issue(email, encoder.encode(code), now);
        verification.saveAndFlush(challenge);
        mailSender.send(email, code);
    }

    @Transactional(noRollbackFor = InvalidVerificationCode.class)
    public void confirmVerification(Principal principal, String code) {
        UserAccount user = lockedUser(principal);
        var now = clock.now();
        var challenge = verification.findById(user.getId()).orElseThrow(InvalidVerificationCode::new);
        String hash = challenge.activeCodeHash(GuestPhase2Service.normalizeEmail(user.getEmail()), now);
        if (hash == null) throw new InvalidVerificationCode();
        if (!encoder.matches(code, hash)) {
            challenge.rejectCode();
            throw new InvalidVerificationCode();
        }
        challenge.verify(now);
    }

    @Transactional
    public GuestApiDtos.ClaimResult claim(Principal principal) {
        UserAccount user = lockedUser(principal);
        String email = GuestPhase2Service.normalizeEmail(user.getEmail());
        boolean verified = verification.findById(user.getId())
                .filter(challenge -> challenge.hasProof(email, clock.now())).isPresent();
        if (!verified) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Verified email is required");

        var guest = guests.findByNormalizedEmail(email).orElse(null);
        if (guest == null || user.getId().equals(guest.getClaimedUserId())) return new GuestApiDtos.ClaimResult(0);
        if (guest.getClaimedUserId() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Guest bookings already have an account owner");
        }

        // Match guest booking's identity-then-event lock order. Future member bookings
        // see the claimed registrations, while existing valid registrations are preserved.
        registrations.findEventIdsByGuestId(guest.getId()).forEach(events::findByIdForUpdate);
        int count = Math.toIntExact(registrations.countByGuestId(guest.getId()));
        guest.claim(user.getId());
        return new GuestApiDtos.ClaimResult(count);
    }

    private UserAccount lockedUser(Principal principal) {
        if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        return users.findForPasswordReset(GuestPhase2Service.normalizeEmail(principal.getName()))
                .filter(user -> user.getRole() == Role.USER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied"));
    }

    private static final class InvalidVerificationCode extends ResponseStatusException {
        private InvalidVerificationCode() {
            super(HttpStatus.BAD_REQUEST, "Invalid or expired verification code");
        }
    }
}
