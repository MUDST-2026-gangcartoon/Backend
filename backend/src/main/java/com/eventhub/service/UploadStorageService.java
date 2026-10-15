
package com.eventhub.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.UUID;

@Service
public class UploadStorageService {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;
    private static final long MAX_IMAGE_PIXELS = 40_000_000L;

    private final Path uploadDirectory;

    public UploadStorageService(
            @Value("${app.upload-dir:./uploads}") String uploadDir
    ) {
        this.uploadDirectory = Path.of(uploadDir)
                .toAbsolutePath()
                .normalize();
    }

    public String storeImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please select an image"
            );
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Image must not exceed 5 MB"
            );
        }

        String contentType = file.getContentType();
        String extension = switch (
                contentType == null
                        ? ""
                        : contentType.toLowerCase(Locale.ROOT)
        ) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            case "image/bmp" -> ".bmp";
            default -> throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Only JPEG, PNG, GIF, and BMP images are supported"
            );
        };

        try {
            byte[] bytes = file.getBytes();

            BufferedImage image = ImageIO.read(
                    new ByteArrayInputStream(bytes)
            );

            if (image == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "The uploaded file is not a valid supported image"
                );
            }

            long pixels = (long) image.getWidth() * image.getHeight();

            if (pixels > MAX_IMAGE_PIXELS) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Image dimensions are too large"
                );
            }

            Files.createDirectories(uploadDirectory);

            String filename = UUID.randomUUID() + extension;
            Path destination = uploadDirectory.resolve(filename);

            Files.write(
                    destination,
                    bytes,
                    StandardOpenOption.CREATE_NEW,
                    StandardOpenOption.WRITE
            );

            return "/uploads/" + filename;

        } catch (IOException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not save uploaded image",
                    e
            );
        }
    }
}