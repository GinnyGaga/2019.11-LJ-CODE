# ======================== 进阶：动态查找 ==================================
from demo3 import find_element          # 从demo3导入封装的find_elemenet方法
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait

driver = webdriver.Chrome(executable_path="chromedriver.exe")
driver.maximize_window()
driver.get("http://132.232.44.158:9999/shopxo/index.php")

search_input = ("id", "search-input")   # 输入框的定位方式
search_buttn = ("id", "ai-topsearch")   # 输入按钮定位方式
huawei_image = ("xpath", "/html/body/div[4]/div/ul/li/div/a/img")       # 华为的图片

# 动态的查找输入框
si = WebDriverWait(driver, 10).until(lambda s: s.find_element(*search_input))
sb = WebDriverWait(driver, 10).until(lambda s: s.find_element(*search_buttn))

si.send_keys("华为")
sb.click()

# 通过二次封装的方法来定位元素
hw = find_element(driver, huawei_image)
hw.click()



