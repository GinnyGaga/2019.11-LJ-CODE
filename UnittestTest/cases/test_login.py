# unittest的测试用例

# 先导入unittest
import time
import unittest
from selenium import webdriver

# 1. 测试用例必须继承unittest.TestCase
@unittest.skip("!23123")
class TestCaseLogin(unittest.TestCase):

    # 2. 成员方法名字以test_
    def test_01_login_success(self):
        chromedriver = 'driver\\chromedriver.exe'
        driver = webdriver.Chrome(executable_path=chromedriver)  # 实例化浏览器 - 打开浏览器获得操作对象
        driver.maximize_window()
        driver.get("http://132.232.44.158:9999/shopxo/admin.php")   # 打开网址
        
        # 去输入用户名密码登录
        driver.find_element_by_name('username').send_keys('admin')
        driver.find_element_by_name('login_pwd').send_keys('shopxo')
        driver.find_element_by_xpath('/html/body/div[1]/div/div[2]/div/form/div/div[3]/button').click()

        time.sleep(3)
        # 断言 - unittest断言
        url = driver.current_url
        self.assertEqual(url, "http://132.232.44.158:9999/shopxo/admin.php?s=/index/index.html")
        print("01")

    def test_02_login_failed(self):
        print("02")

        x = True
        self.assertTrue(x)
        # self.assertFalse(x)

        x = "123"
        print(type(x))
        self.assertIsInstance(x, bool)



# unittest自带的运行方法，不用实例化类的方法
# unittest.main()