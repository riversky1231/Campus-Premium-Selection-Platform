package cn.campus.order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UriUtils;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
@Component
public class IdentityFilter extends OncePerRequestFilter {
 private static final org.slf4j.Logger LOG=org.slf4j.LoggerFactory.getLogger(IdentityFilter.class);
 private final UserPort users;
 public IdentityFilter(UserPort u){users=u;}
 protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
  String path=UriUtils.decode(req.getRequestURI(),java.nio.charset.StandardCharsets.UTF_8);if(path.equals("/actuator/health")||path.equals("/actuator/info")||path.equals("/error")){chain.doFilter(req,res);return;}
  try{String token=req.getHeader("Authorization");if(token==null||!token.startsWith("Bearer "))throw Errors.fail(401,"请先登录");var identity=users.identity(token);if(identity==null||identity.userId()==null)throw Errors.fail(401,"登录无效");Long.parseLong(identity.userId());if(path.startsWith("/api/admin/")&&!"ADMIN".equals(identity.role()))throw Errors.fail(403,"需要管理员权限");req.setAttribute("identity",identity);}
  catch(Exception e){int code=e instanceof org.springframework.web.server.ResponseStatusException r?r.getStatusCode().value():503;if(code>=500)LOG.error("identity verification failed for "+path,e);else LOG.debug("identity rejected for {}: {}",path,e.getMessage());res.setStatus(code);res.setContentType("application/json;charset=UTF-8");res.getWriter().write("{\"message\":\"身份校验失败，请检查登录状态与用户服务\"}");return;}
  chain.doFilter(req,res);
 }
}
