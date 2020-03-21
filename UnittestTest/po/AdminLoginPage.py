from utils.selenium_tools import find_element

class AdminLoginPage():
    def __init__(self, driver):
        """
            封装好所有的元素
        """
        self.url = "http://132.232.44.158:9999/shopxo/admin.php"
        self.title = "ShopXO后台管理系统"
        self.username = ("name", "username")
        self.password = ("name", "login_pwd")
        self.login_btn = ("xpath", '/html/body/div[1]/div/div[2]/div/form/div/div[3]/button')
        
        self.driver = driver

    
    def login(self, un, pw):
        """
            用户登录的步骤
        """
        find_element(self.driver, self.username).send_keys(un)
        find_element(self.driver, self.password).send_keys(pw)
        find_element(self.driver, self.login_btn).click()
