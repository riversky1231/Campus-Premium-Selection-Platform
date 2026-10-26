package cn.campus.order;
import java.math.BigDecimal;
import java.util.*;
public final class Contracts {
 @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
 public record Identity(String userId,String role){}
 @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
 public record Product(Long id,Long categoryId,String name,String description,BigDecimal price,Integer stock,Boolean onSale){}
 public record Stock(String requestId,long productId,int quantity){}
 public record Money(String requestId,long userId,BigDecimal amount){}
 public record Address(long id,String recipient,String phone,String detail){}
}
