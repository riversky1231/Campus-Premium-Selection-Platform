package cn.campus.order;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * 用户服务的 /api/users/identity 返回完整 User 资料，订单服务只关心 userId/role。
 * 必须忽略额外字段，否则 Feign 反序列化会失败并由 IdentityFilter 转成 503。
 */
class ContractsJsonTest {
  @Test
  void identityIgnoresAdditionalProfileFields() throws Exception {
    ObjectMapper mapper = new ObjectMapper();
    mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true);

    String profile =
        "{\"id\":8,\"userId\":\"8\",\"username\":\"student01\",\"nickname\":\"同学\","
            + "\"role\":\"STUDENT\",\"balance\":12.50,\"enabled\":true}";

    Contracts.Identity identity = mapper.readValue(profile, Contracts.Identity.class);

    assertEquals("8", identity.userId());
    assertEquals("STUDENT", identity.role());
  }
}
