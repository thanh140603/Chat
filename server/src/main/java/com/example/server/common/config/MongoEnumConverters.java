package com.example.server.common.config;

import com.example.server.chat.model.ParticipantRole;
import com.example.server.chat.model.ConversationType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.convert.WritingConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class MongoEnumConverters {

    @ReadingConverter
    public static class StringToParticipantRoleConverter implements Converter<String, ParticipantRole> {
        @Override
        public ParticipantRole convert(String source) {
            if (source == null) return null;
            return ParticipantRole.valueOf(source.toUpperCase());
        }
    }

    @WritingConverter
    public static class ParticipantRoleToStringConverter implements Converter<ParticipantRole, String> {
        @Override
        public String convert(ParticipantRole source) {
            return source == null ? null : source.name();
        }
    }

    @Bean
    public MongoCustomConversions mongoCustomConversions() {
        List<Converter<?, ?>> converters = new ArrayList<>();
        converters.add(new StringToParticipantRoleConverter());
        converters.add(new ParticipantRoleToStringConverter());
        converters.add(new StringToConversationTypeConverter());
        converters.add(new ConversationTypeToStringConverter());
        return new MongoCustomConversions(converters);
    }

    @ReadingConverter
    public static class StringToConversationTypeConverter implements Converter<String, ConversationType> {
        @Override
        public ConversationType convert(String source) {
            if (source == null) return null;
            return ConversationType.valueOf(source.toUpperCase());
        }
    }

    @WritingConverter
    public static class ConversationTypeToStringConverter implements Converter<ConversationType, String> {
        @Override
        public String convert(ConversationType source) {
            return source == null ? null : source.name();
        }
    }
}


