import time
from selenium import webdriver

driver = webdriver.Chrome(executable_path="chromedriver.exe")
driver.get("http://132.232.44.158:9999/shopxo/admin.php")


# 先找到元素
u = driver.find_element_by_name("username")
p = driver.find_element_by_name("login_pwd")
l = driver.find_element_by_xpath('/html/body/div[1]/div/div[2]/div/form/div/div[3]/button')

# 然后再来操作，输入用户名和密码
u.send_keys("admin")
p.send_keys("shopxo")
l.click()

time.sleep(10)

# 点击用户管理
um = driver.find_element_by_xpath('//*[@id="admin-offcanvas"]/div/ul/li[5]/a/span[2]')
um.click()

time.sleep(3)
# 点击用户列表
ul = driver.find_element_by_xpath('//*[@id="power-menu-126"]/li/a/span')
ul.click()

# 切换作用域
frame = driver.find_element_by_id('ifcontent')
driver.switch_to_frame(frame)

# 点击新增
new = driver.find_element_by_xpath('/html/body/div[1]/div/div/a[1]')
new.click()

time.sleep(3)

username = driver.find_element_by_name('username')
password = driver.find_element_by_name('pwd')
save_but = driver.find_element_by_xpath('/html/body/div[1]/div/form/div[14]/button')

mz = "zhangyunxing"
username.send_keys(mz)
password.send_keys("xingxing")
save_but.click()

time.sleep(5)

# 获取名字和输入的值进行对比 in
#data-list-349 > td.user-info > ul > li:nth-child(2)
a = driver.find_element_by_xpath('/html/body/div[1]/div/table/tbody/tr[1]/td[2]/ul/li[1]')
print(a.text)
if mz in a.text:
    print("执行通过")
else:
    print("执行失败")

