# ======================== 基础：都要掌握的 ==================================

# 如何编写selenium的脚本
import time


# 导入selenium的第三方包
from selenium import webdriver

# 打开谷歌浏览器,实例化浏览器，driver称为浏览器操作的句柄
driver = webdriver.Chrome(executable_path="chromedriver.exe")
# 窗口最大化
driver.maximize_window()


# 打开网址： http://132.232.44.158:9999/shopxo/index.php
driver.get("http://132.232.44.158:9999/shopxo/index.php")

# 定位元素

# # 1. id值
# e = driver.find_element_by_id("search-input")
# e.send_keys("华为") # 在元素中输入关键字

# anniu = driver.find_element_by_id("ai-topsearch")
# anniu.click()   # 点击元素

# 2. name
e1 = driver.find_element_by_name("wd")
e1.send_keys("华为")

anniu = driver.find_element_by_id("ai-topsearch")
anniu.click()   # 点击元素

# 3. xpath
# e2 = driver.find_element_by_xpath('//*[@id="search-input"]')
# e2.send_keys("华为")

# 4. css selector
# e3 = driver.find_element_by_css_selector('#search-input')
# e3.send_keys("华为")

# 5. link_text 适用于a标签
# e4 = driver.find_element_by_link_text('登录')
# e4.click()  # 点击登录

# 6. partial_link_text
# e5 = driver.find_element_by_partial_link_text('登')
# e5.click()

# 7. classname
# driver.find_element_by_class_name('submit am-btn')

# 8. tag_name
# driver.find_element_by_tag_name('xxx')


# 1. sleep
# 获取价格
time.sleep(3)
jiage = "/html/body/div[4]/div/ul/li/div/p[2]/strong"
jg = driver.find_element_by_xpath(jiage)
print(jg.text)


# 点击图片
tp = '/html/body/div[4]/div/ul/li/div/a/img'
sp = driver.find_element_by_xpath(tp)
sp.click()

# 切换window的作用域
w1 = driver.window_handles[-1]   # 最后一个窗口：-1:表示list的最后一个元素
driver.switch_to_window(w1)     # 把driver的作用域切换到了最后一个窗口了，driver就可以在新跳转出来的窗口操作了

gm = driver.find_element_by_xpath('/html/body/div[4]/div[2]/div[2]/div[3]/div[2]/div/button')
gm.click()

time.sleep(3)

# 切换大网页和小网页的作用域
f = driver.find_element_by_xpath('//*[@id="common-popup-modal-login"]/div/iframe')
driver.switch_to_frame(f)

# 去输入username
u = driver.find_element_by_name('accounts')
u.send_keys("112312312")

# 退出
# driver.quit()