package com.prac4toeic.modules.auth.service;

import com.prac4toeic.modules.auth.dto.AuthResponse;
import com.prac4toeic.modules.auth.dto.LoginRequest;
import com.prac4toeic.modules.auth.dto.RefreshTokenRequest;
import com.prac4toeic.modules.auth.dto.RegisterRequest;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse refreshToken(RefreshTokenRequest request);
    void logout(String refreshToken);
}
