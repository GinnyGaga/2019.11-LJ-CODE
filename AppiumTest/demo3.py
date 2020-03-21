
# 导入appium的python第三包
from appium import webdriver

desired_caps = {}
desired_caps['platformName'] = 'Android'                    # 打开什么平台的app，固定的 > 启动安卓平台
desired_caps['platformVersion'] = '5.1.1'                   # 安卓系统的版本号：adb shell getprop ro.build.version.release
desired_caps['deviceName'] = 'vivo x6plus d'                # 手机/模拟器的型号：adb shell getprop ro.product.model
desired_caps['appPackage'] = 'io.appium.android.apis'       # app的名字：adb shell dumpsys activity | findstr "mFocusedActivity"
desired_caps['appActivity'] = '.ApiDemos'                   # app的启动页名字：adb shell dumpsys activity | findstr "mFocusedActivity"
desired_caps['unicodeKeyboard'] = True                      # 为了支持中文
desired_caps['resetKeyboard'] = True                        # 设置成appium自带的键盘

# 去打开app，并且返回当前app的操作对象
driver = webdriver.Remote('http://localhost:4723/wd/hub', desired_caps)

# 点击home键，键值表：https://www.jianshu.com/p/39e6040d7130
driver.press_keycode(3)

for i in range(10):
    driver.press_keycode(25)
    driver.press_keycode(24)

# 返回
driver.back()

# 滑动
for i in range(10):
    driver.swipe(122, 892, 772, 935)    # 屏幕左滑
    driver.swipe(772, 935, 122, 892)    # 屏幕右滑