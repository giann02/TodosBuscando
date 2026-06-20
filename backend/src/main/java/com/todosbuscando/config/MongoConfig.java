package com.todosbuscando.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.convert.DefaultMongoTypeMapper;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;

@Configuration
@EnableMongoAuditing
@EnableAsync
public class MongoConfig {

    // Elimina el campo _class de los documentos guardados en MongoDB
    @Bean
    public MappingMongoConverter mappingMongoConverter(
            org.springframework.data.mongodb.MongoDatabaseFactory factory,
            MongoMappingContext context) {

        MappingMongoConverter converter = new MappingMongoConverter(
                new org.springframework.data.mongodb.core.convert.DefaultDbRefResolver(factory), context);
        converter.setCustomConversions(new MongoCustomConversions(Collections.emptyList()));
        converter.setTypeMapper(new DefaultMongoTypeMapper(null));
        return converter;
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
