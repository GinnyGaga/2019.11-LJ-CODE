
aa = [2,55,4,16,221,44,22,882,33,10]

# 取第一个数
for i in range(len(aa)):                # i = 0                     i = 0                   i = 0   
    first = aa[i]                       # first=2                   first=2                 first=2
    for j in range(i+1, len(aa)):       # for j in range(1, 10)     for j in range(1, 10)   for j in range(1, 10)
        scend = aa[j]                   # j = 1 > scend = 55        j = 2 > scend = 4       j = 3 > scend = 16
        # 第一个数和后面数进行比较
        if first == scend:              # 2 == 55                      # 2 == 4             2 == 16
            print(first)
            break
    