# ======================== 进阶：二次封装 ==================================

# 自己定义的find_element方法
def find_element(driver, search_buttn):
    from selenium.webdriver.support.ui import WebDriverWait
    return WebDriverWait(driver, 10).until(lambda s: s.find_element(*search_buttn))