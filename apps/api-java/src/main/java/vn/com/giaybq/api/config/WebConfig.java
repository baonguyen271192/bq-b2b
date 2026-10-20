package vn.com.giaybq.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** CORS cho web (Next.js ở cổng khác) và app mobile. */
@Configuration
class WebConfig implements WebMvcConfigurer {

  private final BqProperties props;

  WebConfig(BqProperties props) {
    this.props = props;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOriginPatterns(props.cors().allowedOrigins().split(","))
        .allowedMethods("*")
        .allowedHeaders("*");
  }
}
