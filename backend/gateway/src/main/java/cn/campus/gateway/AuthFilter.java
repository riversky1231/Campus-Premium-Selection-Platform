package cn.campus.gateway;
import org.springframework.stereotype.Component;
import org.springframework.cloud.gateway.filter.*;
import org.springframework.core.Ordered;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import reactor.core.publisher.Mono;
import java.time.Duration;
import java.util.Map;
@Component
public class AuthFilter implements GlobalFilter,Ordered {
 private final WebClient http=WebClient.builder().build();
 @Value("${market.auth-url:http://localhost:8081/api/users/identity}") String authUrl;
 public int getOrder(){return -100;}
 public Mono<Void> filter(ServerWebExchange exchange,GatewayFilterChain chain){
  String path=exchange.getRequest().getURI().getRawPath();String method=exchange.getRequest().getMethod().name();
  if(path.equals("/openapi.yml")||path.equals("/swagger-ui.html")||path.startsWith("/swagger-ui/")||path.startsWith("/webjars/")||path.startsWith("/v3/api-docs"))return chain.filter(exchange);
  if(!path.matches("(/[A-Za-z0-9_\\-]+)+/?"))return reject(exchange,400);
  if(path.startsWith("/api/internal/"))return reject(exchange,404);
  var clean=exchange.mutate().request(exchange.getRequest().mutate().headers(h->{h.remove("X-User-Id");h.remove("X-User-Role");h.remove("TX_XID");}).build()).build();
  if(path.equals("/actuator/health")||method.equals("GET")&&(path.equals("/api/categories")||path.equals("/api/products")||path.startsWith("/api/products/"))||method.equals("POST")&&(path.equals("/api/auth/login")||path.equals("/api/auth/register")||path.equals("/api/auth/wx-login")))return chain.filter(clean);
  String token=exchange.getRequest().getHeaders().getFirst("Authorization");if(token==null||!token.startsWith("Bearer "))return reject(exchange,401);
  return http.get().uri(authUrl).header("Authorization",token).retrieve().bodyToMono(Map.class).timeout(Duration.ofSeconds(5)).flatMap(identity->{if(path.startsWith("/api/admin/")&&!"ADMIN".equals(identity.get("role")))return reject(exchange,403);return chain.filter(clean);}).onErrorResume(org.springframework.web.reactive.function.client.WebClientResponseException.class,e->reject(exchange,e.getStatusCode().is4xxClientError()?401:503)).onErrorResume(e->reject(exchange,503));
 }
 Mono<Void> reject(ServerWebExchange e,int status){e.getResponse().setStatusCode(HttpStatus.valueOf(status));e.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);return e.getResponse().writeWith(Mono.just(e.getResponse().bufferFactory().wrap(("{\"message\":\"请求未授权或身份服务不可用\"}").getBytes(java.nio.charset.StandardCharsets.UTF_8))));}
}
