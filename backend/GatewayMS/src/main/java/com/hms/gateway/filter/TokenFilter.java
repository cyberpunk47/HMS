package com.hms.gateway.filter;


import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;

@Component
public class TokenFilter extends AbstractGatewayFilterFactory<TokenFilter.Config>{
    
    private static final String SECRET = "814b9fa5df51e0cbb0059bbee01f0b2c91f3211e4715ffe1370147047ec4e57bf7a5f89638677afdd1456f3e37db36c8ab55229a38f89002e9e1b97a28370486";

    public TokenFilter(){
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config){
        return (exchange, chain) ->{
            String path = exchange.getRequest().getPath().toString();
            if(path.equals("/user/login") || path.equals("/user/register")){

                return chain.filter(exchange.mutate().request(r->r.header("X-Secret-Key", "SECRET")).build());
            }

            org.springframework.http.HttpHeaders header = exchange.getRequest().getHeaders();

            if(!header.containsKey(org.springframework.http.HttpHeaders.AUTHORIZATION)){
                throw new RuntimeException("Authentication header is missing");
            }
            String authHeader = header.getFirst(org.springframework.http.HttpHeaders.AUTHORIZATION);
            if(authHeader==null || !authHeader.startsWith("Bearer")){
                throw new RuntimeException("Authorization header is invalid");
            }
            String token = authHeader.substring(7);

            try{
                Claims claim = Jwts.parser().setSigningKey(SECRET).parseClaimsJws(token).getBody();
                exchange = exchange.mutate().request(r->r.header("X-User-Id", "SECRET")).build();


            }
            catch(Exception e){
                throw new RuntimeException("Token is invalid");
            }
            return chain.filter(exchange);
        };
    }

    public static class Config{

    }
}
