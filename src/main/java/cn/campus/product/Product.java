package cn.campus.product;
import com.baomidou.mybatisplus.annotation.*;
public class Product {
@TableId(type=IdType.AUTO)
private Long id;
public Long getId(){return id;}
public void setId(Long value){this.id=value;}
private Long categoryId;
public Long getCategoryId(){return categoryId;}
public void setCategoryId(Long value){this.categoryId=value;}
private String name;
public String getName(){return name;}
public void setName(String value){this.name=value;}
private String description;
public String getDescription(){return description;}
public void setDescription(String value){this.description=value;}
private String imageUrl;
public String getImageUrl(){return imageUrl;}
public void setImageUrl(String value){this.imageUrl=value;}
private java.math.BigDecimal price;
public java.math.BigDecimal getPrice(){return price;}
public void setPrice(java.math.BigDecimal value){this.price=value;}
private Integer stock;
public Integer getStock(){return stock;}
public void setStock(Integer value){this.stock=value;}
private Boolean onSale;
public Boolean getOnSale(){return onSale;}
public void setOnSale(Boolean value){this.onSale=value;}
}
