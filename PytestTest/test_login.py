# 首先导入pytest
import pytest
import requests

# 定义pytest测试用例
def test_01_login_success():
    url = "http://132.232.44.158:5000/userLogin/"
    data = {"username":"test", "password":"123456", "captcha":"123456"}
    res = requests.post(url=url, json=data)
    
    # 断言http状态码
    assert 200 == res.status_code
    assert '"code": 200' in res.text

def test_02_login_failed():
    url = "http://132.232.44.158:5000/userLogin/"
    data = {"username":"test", "password":"123456", "captcha":"123456"}
    res = requests.post(url=url, json=data)
    
    # 断言http状态码
    assert 200 == res.status_code
    assert '"code": 200' in res.text


def test_03_index():
    url = "http://132.232.44.158:5000/userLogin/"
    data = {"username":"test", "password":"123456", "captcha":"123456"}
    res = requests.post(url=url, json=data)
    
    # 断言http状态码
    assert 200 == res.status_code
    assert '"code": 200' in res.text
