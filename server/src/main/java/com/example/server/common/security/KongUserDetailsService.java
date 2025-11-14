package com.example.server.common.security;

import com.example.server.user.model.User;
import com.example.server.user.repository.UserRepository;
import com.example.server.common.util.KongUserExtractor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * UserDetailsService for Kong Gateway mode
 * Extracts user info from Kong headers instead of JWT token
 */
@Service
public class KongUserDetailsService implements UserDetailsService {
    
    private final UserRepository userRepository;
    private final KongUserExtractor kongUserExtractor;
    
    public KongUserDetailsService(UserRepository userRepository, KongUserExtractor kongUserExtractor) {
        this.userRepository = userRepository;
        this.kongUserExtractor = kongUserExtractor;
    }
    
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // In Kong mode, we get userId from headers, not username
        HttpServletRequest request = getCurrentRequest();
        if (request == null) {
            throw new UsernameNotFoundException("No HTTP request available");
        }
        
        KongUserExtractor.KongUserInfo kongUserInfo = kongUserExtractor.getUserInfo(request);
        if (!kongUserInfo.isValid()) {
            throw new UsernameNotFoundException("No valid Kong user info found");
        }
        
        String userId = kongUserInfo.getUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with ID: " + userId));
        
        return new CustomUserDetails(user);
    }
    
    private HttpServletRequest getCurrentRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes != null ? attributes.getRequest() : null;
    }
}
