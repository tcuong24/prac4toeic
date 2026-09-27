package com.prac4toeic.modules.auth.service.impl;

import com.prac4toeic.common.exception.AppException;
import com.prac4toeic.common.exception.ErrorCode;
import com.prac4toeic.modules.auth.dto.AuthResponse;
import com.prac4toeic.modules.auth.dto.LoginRequest;
import com.prac4toeic.modules.auth.dto.RefreshTokenRequest;
import com.prac4toeic.modules.auth.dto.RegisterRequest;
import com.prac4toeic.modules.auth.service.AuthService;
import com.prac4toeic.modules.user.entity.Role;
import com.prac4toeic.modules.user.entity.User;
import com.prac4toeic.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final JwtDecoder jwtDecoder;

    @Value("${application.jwt.access-token-expiration-seconds:900}")
    private long accessTokenExpirationSeconds;

    @Value("${application.jwt.refresh-token-expiration-seconds:604800}")
    private long refreshTokenExpirationSeconds;

    @Value("${application.jwt.issuer:prac4toeic-api}")
    private String issuer;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        User user = User.builder()
                .email(request.email().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.fullName().trim())
                .role(Role.ROLE_USER)
                .active(true)
                .build();

        userRepository.save(user);

        String accessToken = generateToken(user, accessTokenExpirationSeconds, "access");
        String refreshToken = generateToken(user, refreshTokenExpirationSeconds, "refresh");

        return AuthResponse.of(accessToken, refreshToken, accessTokenExpirationSeconds);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email().toLowerCase().trim())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }

        String accessToken = generateToken(user, accessTokenExpirationSeconds, "access");
        String refreshToken = generateToken(user, refreshTokenExpirationSeconds, "refresh");

        return AuthResponse.of(accessToken, refreshToken, accessTokenExpirationSeconds);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        try {
            Jwt jwt = jwtDecoder.decode(request.refreshToken());
            String tokenType = jwt.getClaimAsString("token_type");
            if (!"refresh".equals(tokenType)) {
                throw new AppException(ErrorCode.INVALID_TOKEN);
            }

            String email = jwt.getSubject();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

            String newAccessToken = generateToken(user, accessTokenExpirationSeconds, "access");
            String newRefreshToken = generateToken(user, refreshTokenExpirationSeconds, "refresh");

            return AuthResponse.of(newAccessToken, newRefreshToken, accessTokenExpirationSeconds);
        } catch (Exception ex) {
            throw new AppException(ErrorCode.INVALID_TOKEN);
        }
    }

    @Override
    public void logout(String refreshToken) {
        // Có thể bổ sung blacklist token vào Redis/DB trong các giai đoạn tiếp theo
    }

    private String generateToken(User user, long expirySeconds, String tokenType) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(now.plusSeconds(expirySeconds))
                .subject(user.getEmail())
                .claim("userId", user.getId())
                .claim("role", user.getRole().name())
                .claim("token_type", tokenType)
                .build();

        JwsHeader jwsHeader = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(jwsHeader, claims)).getTokenValue();
    }
}
