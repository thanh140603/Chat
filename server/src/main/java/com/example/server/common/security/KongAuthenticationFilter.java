package com.example.server.common.security;

import com.example.server.common.util.KongUserExtractor;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Authentication filter for Kong Gateway mode
 * Extracts user info from Kong headers and sets up Spring Security context
 */
@Component
public class KongAuthenticationFilter extends OncePerRequestFilter {
    
    private final KongUserExtractor kongUserExtractor;
    private final UserDetailsService userDetailsService;
    
    public KongAuthenticationFilter(KongUserExtractor kongUserExtractor, UserDetailsService userDetailsService) {
        this.kongUserExtractor = kongUserExtractor;
        this.userDetailsService = userDetailsService;
    }
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) 
            throws ServletException, IOException {
        
        try {
            KongUserExtractor.KongUserInfo kongUserInfo = kongUserExtractor.getUserInfo(request);
            
            if (kongUserInfo.isValid() && SecurityContextHolder.getContext().getAuthentication() == null) {
                // Kong has verified the user, now load user details
                UserDetails userDetails = userDetailsService.loadUserByUsername(kongUserInfo.getUserId());
                
                if (userDetails != null) {
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities()
                    );
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        } catch (Exception e) {
            logger.warn("Failed to authenticate user from Kong headers", e);
        }
        
        filterChain.doFilter(request, response);
    }
}
