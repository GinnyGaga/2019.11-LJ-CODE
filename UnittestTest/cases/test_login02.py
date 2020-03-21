# unittest的测试用例

# 先导入unittest
import time
import unittest
from selenium import webdriver
from po.AdminLoginPage import AdminLoginPage

# 1. 测试用例必须继承unittest.TestCase
class TestCaseLogin(unittest.TestCase):

    # 类方法：TestCaseLogin运行的时候去一次
    @classmethod
    def setUpClass(cls):
        chromedriver = 'driver\\chromedriver.exe'
        cls.driver = webdriver.Chrome(executable_path=chromedriver)  # 实例化浏览器 - 打开浏览器获得操作对象
        cls.driver.maximize_window()

    # 类方法：TestCaseLogin结束运行的时候去一次
    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()

    # 成员方法
    def setUp(self):
        self.driver.delete_all_cookies()        # 请求的时候删掉所有的cookie = 全新去访问这个
        self.driver.get("http://132.232.44.158:9999/shopxo/admin.php")

    # 2. 成员方法名字以test_
    def test_01_login_success(self):
        # 去输入用户名密码登录
        self.driver.find_element_by_name('username').send_keys('admin')
        self.driver.find_element_by_name('login_pwd').send_keys('shopxo')
        self.driver.find_element_by_xpath('/html/body/div[1]/div/div[2]/div/form/div/div[3]/button').click()

        time.sleep(3)
        # 断言 - unittest断言
        url = self.driver.current_url
        self.assertEqual(url, "http://132.232.44.158:9999/shopxo/admin.php?s=/index/index.html")
        print("01")

    def test_02_login_failed(self):
        self.driver.find_element_by_name('username').send_keys('admin')
        self.driver.find_element_by_name('login_pwd').send_keys('shopxo')
        self.driver.find_element_by_xpath('/html/body/div[1]/div/div[2]/div/form/div/div[3]/button').click()


    def test_03_po_login(self):
        """
            这个是po模式的例子
        """
        admin_login = AdminLoginPage(self.driver)
        admin_login.login("admin", "shopxo")

        time.sleep(5)