# post方法的demo
import requests

# json：字典格式
url = "http://132.232.44.158:5000/userLogin/"   # 接口地址
data = {"username":"test", "password":"test", "captcha":"123456"}   # 传递的数据，字典格式

res = requests.post(url=url, json=data) # 向url接口使用post方法传递data的json数据
print(res.text)

# form-data：推荐用postman生成代码的方式来实现
# request02.py