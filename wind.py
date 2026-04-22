import base64
import json
import os
import time
import io
import csv
from PIL import Image
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import ddddocr

# --- 1. 配置与初始化 ---
# 强制环境变量，防止 OCR 在 Actions 里抢占 CPU 导致浏览器崩溃
os.environ['ONNXRUNTIME_EXECUTION_MODE'] = 'SEQUENTIAL'

ocr = ddddocr.DdddOcr(show_ad=False)
MAPPING_FILE = "weather_mapping.json"
OUTPUT_CSV = "sz_wind_data_updated.csv"

if os.path.exists(MAPPING_FILE) and os.path.getsize(MAPPING_FILE) > 0:
    try:
        with open(MAPPING_FILE, "r", encoding="utf-8") as f:
            value_mapping = json.load(f)
    except json.JSONDecodeError:
        print(f"警告: {MAPPING_FILE} 格式损坏，已重置。")
        value_mapping = {}
else:
    value_mapping = {}

# 你的 54 个站点列表保持不变
BASE_STATIONS = [
    ["田头", 0, 0, 114.408, 22.689, "G3731", "石井"], ["梧桐村", 0, 0, 114.188, 22.594, "G1174", "东湖"],
    ["后瑞", 0, 0, 113.83, 22.631, "G3575", "航城"], ["松岗", 0, 0, 113.836, 22.778, "G3550", "松岗"],
    ["共和", 0, 0, 113.798, 22.755, "G3781", "沙井"], ["观象台", 0, 0, 113.932, 22.685, "59486", "石岩"],
    ["龙城", 0, 0, 114.242, 22.724, "G3570", "龙城"], ["平湖", 0, 0, 114.135, 22.676, "G3559", "平湖"],
    ["南山", 0, 0, 113.919, 22.519, "G3555", "南山"], ["和平", 0, 0, 113.788, 22.694, "G3746", "福海"],
    ["海山", 0, 0, 114.232, 22.557, "G3578", "海山"], ["南头", 0, 0, 113.914, 22.557, "G3546", "南头"],
    ["清水河", 0, 0, 114.101, 22.571, "G3527", "清水河"], ["圳美", 0, 0, 113.954, 22.798, "G3722", "新湖"],
    ["邮轮中心", 0, 0, 113.897, 22.476, "G3585", "招商"], ["公明", 0, 0, 113.891, 22.782, "G3529", "公明"],
    ["布吉", 0, 0, 114.124, 22.606, "G1166", "布吉"], ["南澳", 0, 0, 114.486, 22.534, "G3563", "南澳"],
    ["坪山", 0, 0, 114.34, 22.694, "G3538", "坪山"], ["岗厦", 0, 0, 114.046, 22.534, "G3773", "福保"],
    ["福城", 0, 0, 114.029, 22.733, "G3783", "福城"], ["阿婆髻", 0, 0, 113.882, 22.692, "G1132", "玉塘"],
    ["横岗", 0, 0, 114.193, 22.644, "G3560", "横岗"], ["大磡", 0, 0, 113.948, 22.61, "G3766", "西丽"],
    ["葵涌", 0, 0, 114.426, 22.635, "G1163", "葵涌"], ["西部通道", 0, 0, 113.939, 22.491, "G3641", "蛇口"],
    ["大鹏", 0, 0, 114.469, 22.6, "G1162", "大鹏"], ["塘家", 0, 0, 113.96, 22.721, "G3727", "凤凰"],
    ["观湖", 0, 0, 114.075, 22.7, "G3543", "观湖"], ["南园", 0, 0, 114.096, 22.537, "G3747", "南园"],
    ["光明", 0, 0, 113.944, 22.759, "G3528", "光明"], ["清林径", 0, 0, 114.238, 22.765, "G3564", "龙岗"],
    ["翠竹", 0, 0, 114.133, 22.558, "G3577", "翠竹"], ["莲塘", 0, 0, 114.171, 22.561, "G1173", "莲塘"],
    ["大康", 0, 0, 114.233, 22.646, "G3554", "园山"], ["大冲", 0, 0, 113.947, 22.551, "G3720", "粤海"],
    ["坑梓", 0, 0, 114.366, 22.746, "G3537", "坑梓"], ["燕山", 0, 0, 113.849, 22.82, "G3785", "燕罗"],
    ["铁岗水库", 0, 0, 113.884, 22.583, "G3692", "西乡"], ["大学城", 0, 0, 113.973, 22.596, "G3565", "桃源"],
    ["南湾", 0, 0, 114.158, 22.634, "G3558", "南湾"], ["大浪", 0, 0, 114.003, 22.683, "G3551", "大浪"],
    ["世界之窗", 0, 0, 113.969, 22.539, "G3561", "沙河"], ["基本站", 0, 0, 114.006, 22.541, "59493", "香蜜湖"],
    ["民治", 0, 0, 114.029, 22.622, "G3553", "民治"], ["细靓北", 0, 0, 114.08, 22.626, "G3739", "吉华"],
    ["小梅沙", 0, 0, 114.302, 22.602, "G1125", "梅沙"], ["坪地", 0, 0, 114.303, 22.777, "G3539", "坪地"],
    ["梅林水库", 0, 0, 114.047, 22.578, "G3562", "梅林"], ["江岭", 0, 0, 114.343, 22.651, "G3749", "马峦"],
    ["万丰", 0, 0, 113.82, 22.728, "G3557", "新桥"], ["明珠", 0, 0, 114.253, 22.594, "G3742", "盐田"],
    ["三棵松", 0, 0, 114.308, 22.712, "G3508", "宝龙"], ["沙湖", 0, 0, 114.3, 22.669, "G3753", "碧岭"], ["后底坑", 0, 0, 113.891, 22.759, "G1143", "马田"]
]

def get_value_from_b64(b64_str):
    raw_b64 = b64_str.split(',')[-1]
    if raw_b64 in value_mapping:
        return value_mapping[raw_b64]
    
    img = Image.open(io.BytesIO(base64.b64decode(raw_b64)))
    background = Image.new("RGB", img.size, (255, 255, 255))
    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
    img = background.resize((img.width * 4, img.height * 4), Image.LANCZOS)
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    res = ocr.classification(buf.getvalue())
    
    if res.isdigit() and len(res) >= 2:
        res = res[:-1] + "." + res[-1]
    
    value_mapping[raw_b64] = res
    return res

# --- 2. 爬虫抓取逻辑 ---
options = webdriver.ChromeOptions()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--window-size=1920,1080')
options.add_argument('--disable-gpu')

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

# 核心设置：设置一个合理的页面加载超时
driver.set_page_load_timeout(40) 

realtime_data = {} 

try:
    print("正在尝试访问页面...")
    try:
        driver.get("https://weather.sz.gov.cn/qixiangfuwu/qixiangjiance/zidongzhanchaxun/index.html")
    except Exception as e:
        # 如果加载超时，强制停止加载，尝试继续运行脚本
        print("页面加载超过 40 秒，强制停止并尝试解析现有 DOM...")
        driver.execute_script("window.stop();")

    wait = WebDriverWait(driver, 30)

    # 步骤 1: 切换到风速风向
    wind_main = wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(),'风速风向')]")))
    driver.execute_script("arguments[0].click();", wind_main)
    time.sleep(3)

    # 步骤 2: 切换到日最大瞬时
    sub_tab = wait.until(EC.presence_of_element_located((By.ID, "mdngv_Wind_DmaxS")))
    driver.execute_script("arguments[0].click();", sub_tab)
    
    # 这里的等待很关键，给数据渲染留出充足时间
    print("正在等待表格渲染...")
    time.sleep(12) 

    rows = driver.find_elements(By.CSS_SELECTOR, "#obtlist tr.obtitem")
    print(f"找到 {len(rows)} 行数据，开始处理...")

    for row in rows:
        try:
            # 必须滚动，否则云端可能抓不到图片地址
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", row)
            cells = row.find_elements(By.TAG_NAME, "td")
            if len(cells) >= 3:
                name = cells[1].get_attribute('innerText').strip()
                clean_name = name.replace("街道", "")
                
                # 获取图片地址
                img_element = cells[2].find_element(By.TAG_NAME, "img")
                src = img_element.get_attribute("src")
                val_ms = get_value_from_b64(src)
                
                try:
                    realtime_data[clean_name] = float(val_ms)
                except:
                    realtime_data[clean_name] = 0.0
        except: 
            continue

    # --- 3. CSV 自动更新逻辑 ---
    print(f"抓取完成，成功匹配到 {len(realtime_data)} 个街道。正在写入 CSV...")
    with open(OUTPUT_CSV, mode='w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["自动站点", "日最大瞬时风力（m/s）", "kph", "经度", "纬度", "自动站号", "代表街道"])
        
        for station in BASE_STATIONS:
            site_name, ms, kph, lon, lat, sn, street = station
            current_ms = realtime_data.get(street, 0.0)
            current_kph = round(current_ms * 3.6, 1)
            writer.writerow([site_name, current_ms, current_kph, lon, lat, sn, street])

    # 保存映射
    with open(MAPPING_FILE, "w", encoding="utf-8") as f:
        json.dump(value_mapping, f, ensure_ascii=False, indent=4)
        
    print(f"✨ 气象数据更新成功！")

finally:
    driver.quit()
