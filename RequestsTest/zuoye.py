# 作业
import requests

# 1. 账号信息
account =  [["test", "123456"], ["test", "123456"]]


# 2. 取出每一次的账号

# 2.1 构造请求
for a in account:
    username = a[0]
    password = a[1]

    method = "post"
    url = "http://132.232.44.158:5000/userLogin/"
    data = {"username": username, "password": password, "captcha":"123456"}

    res = requests.request(method=method, url=url, json=data)
    try:
        assert res.status_code == 200
        assert '"code": 200' in res.text
        print("测试用例执行通过！")
    except:
        print("测试用例执行失败！")
        

