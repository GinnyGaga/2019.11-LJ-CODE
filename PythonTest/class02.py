# ==================== 进阶：能掌握就掌握，不能掌握就算了 ==============================
# 类的构造方法


class Person():
    name = "李博宇"
    sex = "男"

    # 构造方法，固定的写法：初始化类
    def __init__(self, xb, mz):
        self.sex = xb
        self.name = mz
        self.test()

    def test(self):
        print("这是test方法")

d = Person("女", "王广发")
print(d.sex)
print(d.name)


