'''
print("hello world!")
print(2333)
print(199.99)
print(True)
print(False)

print("你好",222,"哈哈哈")

a = int(input("请输入第一个数字："))
b = int(input("请输入第二个数字："))
c = a + b
print("a和b的和等于：",c)
print("布尔值的产生：",a > b)

aa = input("请输入你要计算字段的内容：")
print("您输入的字数是：",len(aa))


xx = (1,"哈哈哈","希希",None,2.333,1,1,1,1,1,1)
cc = xx.count("1")  #count是用来统计这个xx元组里面的某个值的个数的
print("元组里统计的值的个数：",cc)
dd = xx.index(1)
print(dd)


xx = [1,2,"哈哈","哈哈","嘻嘻","呜呜",2333]
xx.append(112233) # 往数组中插入数据
print(xx)
xx.insert(0,"insert插入的值")  # insert可以控制数据插入的位置
print(xx)

print(xx.remove("哈哈"))
print(xx.pop(3))




xx = {
    0:"张三",
    1:"李四",
    "name":"王五",
    "yuanzu":(2,3,4,5),
    "shuzu":["哈哈","嘻嘻","嘿嘿"]
    }
yy = [1,2,3,4,"哈哈",["嘿嘿","四川","窝窝头"]]


name = input("请输入你的姓名：")
aihao = input("请输入你的爱好：")
job = input("请输入你的职业：")

xx = "大家好，我叫{name}{name}{name}{name}{name}{name},我是{job}{job}{job}{job}{job}{job}，我的爱好是{aihao},做{job}很有\
    趣".format(job=job,name=name,aihao=aihao)
print(xx)



a = input("请输入：")
xx = "你好，{name},{name}{name}{name}{name}{name}".format(name=a)
print(xx)



money = float(input("请输入红包的金额："))
if money>=0.01 and money<=200:
    print("发送红包成功，金额{}".format(money))
else:
    print("发送红包失败，{}不在范围内".format(money))




age = int(input("请输入你的年龄："))
if age > 25:
    print("生活的艰辛，需要你负重前行！")
elif age > 18:
    print("不要辜负大学的美好时光~")
elif age > 12:
    print("中学的时候不要去早恋！")
else:
    print("你还小，好好的享受你的童年~")

a = "2"

if a in "abcdefg":
    print("a是一个字母")
elif a in "0123456789":
    print("a是一个数字")
else:
    print("不知道")

'''




'''
money = input("请输入红包的金额：")  # 188.987665
for i in money:
    if i not in "0123456789.":
        print("输入的值不合法，请输入数字!")
        exit()
xx = money.count(".")
if xx > 1:
    print("输入的值不合法！")
else:
    if "." in money:
        yy = money.index(".") + 1
        zz = len(money)
        floatlen = zz - yy
        if floatlen > 2:
            print("只能有2位小数！")
        else:
            money = float(money)
            if money>=0.01 and money<=200:
                print("发送红包成功，金额{}".format(money))
            else:
                print("发送红包失败，{}不在范围内".format(money))         
    else:
        money = float(money)
        if money>=0.01 and money<=200:
            print("发送红包成功，金额{}".format(money))
        else:
            print("发送红包失败，{}不在范围内".format(money))


xx = ["你好",2.33,44,45,56,656,"哈哈","嘻嘻","dhdh"]
for i in xx:
    if (type(i) is not int) and (type(i) is not float):
        continue
    print(i)
    
'''

# import time

# for i in range(10):
#     print("哈哈哈哈")
#     time.sleep(1)


jixu = True

while jixu:
    a = input("请输入一个数字：")
    a = int(a)
    if type(a) == int or type(a) == float:
        print("数字")
        jixu = False
    else:
        print("非数字")