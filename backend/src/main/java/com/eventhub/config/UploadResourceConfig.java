
package com.eventhub.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class UploadResourceConfig implements WebMvcConfigurer {

    private final Path uploadDirectory;

    public UploadResourceConfig(
            @Value("${app.upload-dir:./uploads}") String uploadDir
    ) {
        this.uploadDirectory = Path.of(uploadDir)
                .toAbsolutePath()
                .normalize();
    }

    @Override
    public void addResourceHandlers(
            ResourceHandlerRegistry registry
    ) {
        String location = uploadDirectory.toUri().toString();

        if (!location.endsWith("/")) {
            location += "/";
        }

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location);
    }
}