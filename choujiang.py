# coding:utf-8

import random

# students = ["王宝兰","刘鑫雄","王雅婷","姚英东","李勃雨","张佩","毛佳玲","代金池","陈玲","张婉娇","李雯玉","黄宏玲","张艳","周雪璐","马国玺","丁龙","白飞","周若依","王丽君","王广发","王艺颖","嵇蒙荣","郭家祥","尹祖良","黄泽娜","燕爽","徐嘉欢","陈新","陈超","王瑶","陈润"]
students = ["李雯玉","单珍","黄奕萍","王艺颖","罗萍","燕爽","朱雨","罗佳","温伟梁","苏晓晨","赖文惠","冉小迪","艾小辉","齐爽","牛如梦","蔡秋娜","胡颂平","姜明瑛","磨金妮","邹勇","柳源","付琦琦","向阳","范雪峰","阿肥","李静","江芳萍","文梦瑶","吴娟","何琪愿","袁辛"]


def isgongping():
    loops = 1000

    times = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    for i in range(loops):
        student_index = random.randint(0,len(students)-1)
        times[student_index] = times[student_index] + 1

    t = []
    for a in times:
        t.append(a/loops)

    print(times)

# isgongping()
print("我们的幸运儿是 ->", students[random.randint(0,len(students)-1)])