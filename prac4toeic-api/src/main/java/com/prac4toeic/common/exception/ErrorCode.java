package com.prac4toeic.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION("Lỗi hệ thống không xác định", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY("Khóa không hợp lệ", HttpStatus.BAD_REQUEST),
    RESOURCE_NOT_FOUND("Không tìm thấy tài nguyên yêu cầu", HttpStatus.NOT_FOUND),
    UNAUTHENTICATED("Chưa xác thực, vui lòng đăng nhập", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED("Bạn không có quyền truy cập chức năng này", HttpStatus.FORBIDDEN),
    USER_EXISTED("Người dùng đã tồn tại trong hệ thống", HttpStatus.BAD_REQUEST),
    USER_NOT_EXISTED("Người dùng không tồn tại", HttpStatus.NOT_FOUND),
    INVALID_CREDENTIALS("Email hoặc mật khẩu không chính xác", HttpStatus.BAD_REQUEST),
    INVALID_TOKEN("Token không hợp lệ hoặc đã hết hạn", HttpStatus.UNAUTHORIZED),
    CONFLICT_TEST("Đã có bài test đang làm dở, hãy tiếp tục làm bài cũ thay vì tạo mới",HttpStatus.CONFLICT),
    TEST_NOT_FOUND("Không tìm thấy bài test này", HttpStatus.NOT_FOUND),
    VALIDATION_ERROR("Dữ liệu gửi lên không hợp lệ", HttpStatus.BAD_REQUEST);

    private final String message;
    private final HttpStatus httpStatus;

    ErrorCode(String message, HttpStatus httpStatus) {
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
