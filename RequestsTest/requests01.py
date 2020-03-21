# 导入requests
import requests


url = "http://www.weather.com.cn/data/sk/101010100.html"    # 定义url变量存放网址
res = requests.get(url)                                     # 使用get方法请求网址，把获得结果，保存到res变量中、
a = res.text                                                # 获取返回值文本
# print(a)

# 取返回值里面time的值
b = res.json()          # 把返回值转换成字典
# print(b)
time = b["weatherinfo"]["time"] # 取出time
print(time)