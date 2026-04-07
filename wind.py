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
import os
os.environ['ONNXRUNTIME_EXECUTION_MODE'] = 'SEQUENTIAL' # 强制顺序执行，减少内存占用

# --- 1. 配置与初始化 ---
MAPPING_FILE = "weather_mapping.json"  # 确保这一行在最前面，且没有被删掉
OUTPUT_CSV = "sz_wind_data_updated.csv"

# 初始化 OCR
ocr = ddddocr.DdddOcr(show_ad=False)

# 确保在读取映射表时使用了正确的变量名
if os.path.exists(MAPPING_FILE):
    with open(MAPPING_FILE, "r", encoding="utf-8") as f:
        value_mapping = json.load(f)
else:
    value_mapping = {}

# 固定的 54 个站点基础信息 (根据你提供的数据)
BASE_STATIONS = [
    ["田头", 0, 0, 114.408, 22.689, "G3731", "石井"],
    ["梧桐村", 0, 0, 114.188, 22.594, "G1174", "东湖"],
    ["后瑞", 0, 0, 113.83, 22.631, "G3575", "航城"],
    ["松岗", 0, 0, 113.836, 22.778, "G3550", "松岗"],
    ["共和", 0, 0, 113.798, 22.755, "G3781", "沙井"],
    ["观象台", 0, 0, 113.932, 22.685, "G59486", "石岩"],
    ["龙城", 0, 0, 114.242, 22.724, "G3570", "龙城"],
    ["平湖", 0, 0, 114.135, 22.676, "G3559", "平湖"],
    ["南山", 0, 0, 113.919, 22.519, "G3555", "南山"],
    ["和平", 0, 0, 113.788, 22.694, "G3746", "福海"],
    ["海山", 0, 0, 114.232, 22.557, "G3578", "海山"],
    ["南头", 0, 0, 113.914, 22.557, "G3546", "南头"],
    ["清水河", 0, 0, 114.101, 22.571, "G3527", "清水河"],
    ["圳美", 0, 0, 113.954, 22.798, "G3722", "新湖"],
    ["邮轮中心", 0, 0, 113.897, 22.476, "G3585", "招商"],
    ["公明", 0, 0, 113.891, 22.782, "G3529", "公明"],
    ["布吉", 0, 0, 114.124, 22.606, "G1166", "布吉"],
    ["南澳", 0, 0, 114.486, 22.534, "G3563", "南澳"],
    ["坪山", 0, 0, 114.34, 22.694, "G3538", "坪山"],
    ["岗厦", 0, 0, 114.046, 22.534, "G3773", "福保"],
    ["福城", 0, 0, 114.029, 22.733, "G3783", "福城"],
    ["阿婆髻", 0, 0, 113.882, 22.692, "G1132", "玉塘"],
    ["横岗", 0, 0, 114.193, 22.644, "G3560", "横岗"],
    ["大磡", 0, 0, 113.948, 22.61, "G3766", "西丽"],
    ["葵涌", 0, 0, 114.426, 22.635, "G1163", "葵涌"],
    ["西部通道", 0, 0, 113.939, 22.491, "G3641", "蛇口"],
    ["大鹏", 0, 0, 114.469, 22.6, "G1162", "大鹏"],
    ["塘家", 0, 0, 113.96, 22.721, "G3727", "凤凰"],
    ["观湖", 0, 0, 114.075, 22.7, "G3543", "观湖"],
    ["南园", 0, 0, 114.096, 22.537, "G3747", "南园"],
    ["光明", 0, 0, 113.944, 22.759, "G3528", "光明"],
    ["清林径", 0, 0, 114.238, 22.765, "G3564", "龙岗"],
    ["翠竹", 0, 0, 114.133, 22.558, "G3577", "翠竹"],
    ["莲塘", 0, 0, 114.171, 22.561, "G1173", "莲塘"],
    ["大康", 0, 0, 114.233, 22.646, "G3554", "圆山"],
    ["大冲", 0, 0, 113.947, 22.551, "G3720", "粤海"],
    ["坑梓", 0, 0, 114.366, 22.746, "G3537", "坑梓"],
    ["燕山", 0, 0, 113.849, 22.81, "G3785", "燕罗"],
    ["铁岗水库", 0, 0, 113.884, 22.583, "G3692", "西乡"],
    ["大学城", 0, 0, 113.973, 22.596, "G3565", "桃源"],
    ["南湾", 0, 0, 114.158, 22.634, "G3558", "南湾"],
    ["大浪", 0, 0, 114.003, 22.683, "G3551", "大浪"],
    ["世界之窗", 0, 0, 113.969, 22.539, "G3561", "沙河"],
    ["基本站", 0, 0, 114.006, 22.541, "G59493", "香蜜湖"],
    ["民治", 0, 0, 114.029, 22.622, "G3553", "民治"],
    ["细靓北", 0, 0, 114.08, 22.626, "G3739", "吉华"],
    ["小梅沙", 0, 0, 114.302, 22.602, "G1125", "梅沙"],
    ["坪地", 0, 0, 114.303, 22.777, "G3539", "坪地"],
    ["梅林水库", 0, 0, 114.047, 22.578, "G3562", "梅林"],
    ["江岭", 0, 0, 114.343, 22.651, "G3749", "马峦"],
    ["万丰", 0, 0, 113.82, 22.728, "G3557", "新桥"],
    ["明珠", 0, 0, 114.253, 22.594, "G3742", "盐田"],
    ["三棵松", 0, 0, 114.308, 22.712, "G3508", "宝龙"],
    ["沙湖", 0, 0, 114.3, 22.669, "G3753", "碧岭"]
]

if os.path.exists(MAPPING_FILE):
    with open(MAPPING_FILE, "r", encoding="utf-8") as f:
        value_mapping = json.load(f)
else:
    value_mapping = {}

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
# --- 1. 强化版 Chrome 配置 ---
options = webdriver.ChromeOptions()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage') # 核心：解决内存溢出导致的 Read Timeout
options.add_argument('--disable-gpu')
options.add_argument('--window-size=1920,1080')
options.add_argument('--blink-settings=imagesEnabled=true')

# 针对 GitHub Actions 的额外优化
options.add_argument('--disk-cache-dir=/tmp/selenium-cache') 
options.add_experimental_option("excludeSwitches", ["enable-automation"])
options.add_experimental_option('useAutomationExtension', False)

# --- 2. 增加启动超时设置 ---
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=options)

# 设置页面加载超时为 60 秒，防止死等 120 秒
driver.set_page_load_timeout(60) 
# 设置脚本执行超时
driver.set_script_timeout(60)

try:
    print("正在尝试访问页面...")
    driver.get("https://weather.sz.gov.cn/qixiangfuwu/qixiangjiance/zidongzhanchaxun/index.html")
    wait = WebDriverWait(driver, 20)

    # 切换 Tab 到 日最大瞬时
    wind_main = wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(),'风速风向')]")))
    driver.execute_script("arguments[0].click();", wind_main)
    time.sleep(3)
    sub_tab = wait.until(EC.presence_of_element_located((By.ID, "mdngv_Wind_DmaxS")))
    driver.execute_script("arguments[0].click();", sub_tab)
    time.sleep(6)

    rows = driver.find_elements(By.CSS_SELECTOR, "#obtlist tr.obtitem")
    for row in rows:
        try:
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", row)
            cells = row.find_elements(By.TAG_NAME, "td")
            if len(cells) >= 3:
                name = cells[1].get_attribute('innerText').strip()
                # 修正街道名称，匹配基础信息里的“代表街道”（去掉“街道”两字）
                clean_name = name.replace("街道", "")
                
                src = cells[2].find_element(By.TAG_NAME, "img").get_attribute("src")
                val_ms = get_value_from_b64(src)
                
                try:
                    realtime_data[clean_name] = float(val_ms)
                except:
                    realtime_data[clean_name] = 0.0
        except: continue

    # --- 3. CSV 自动更新逻辑 ---
    with open(OUTPUT_CSV, mode='w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        # 写入表头
        writer.writerow(["自动站点", "日最大瞬时风力（m/s）", "kph", "经度", "纬度", "自动站号", "代表街道"])
        
        for station in BASE_STATIONS:
            site_name, ms, kph, lon, lat, sn, street = station
            
            # 从抓取到的数据中匹配风速
            current_ms = realtime_data.get(street, 0.0)
            current_kph = round(current_ms * 3.6, 1)
            
            # 更新列表中的值并写入 CSV
            writer.writerow([site_name, current_ms, current_kph, lon, lat, sn, street])

    with open(MAPPING_FILE, "w", encoding="utf-8") as f:
        json.dump(value_mapping, f, ensure_ascii=False, indent=4)
        
    print(f"\n✨ CSV 文件已成功更新至: {OUTPUT_CSV}")

finally:
    driver.quit()
