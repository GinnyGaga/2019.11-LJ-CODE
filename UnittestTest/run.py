"""
    整个工具/框架运行的入口
"""
import unittest
from utils.HTMLTestRunner import HTMLTestRunner

# 1. 加载所有的测试用例
# 查找cases文件夹下面的所有以test_开头.py文件结尾的py文件
# class里面的成员方法都必须是test_
testcases = unittest.defaultTestLoader.discover('cases', 'test_*.py')

# 2. 把测试用例装在到测试套件:测试集
testsuite = unittest.TestSuite()
testsuite.addTests(testcases)

# 3.运行所有的测试用例，并且生成测试报告
title = "测试报告"
descr = "测试报告的描述"
report = "./report/report.html"

with open(report, "wb") as f:   # 创建或者覆盖report执行的文件，再把这个文件的对象给f变量
    runner = HTMLTestRunner(stream=f, title=title, description=descr)   # 初始化htmltestrunner
    runner.run(testsuite)                                               # 使用run方法运行所有的测试集