# -*- coding: utf-8 -*-
"""
金蝶云数据同步脚本（最简 MVP 版本）

使用方法:
python sync_kingdee.py --all          # 同步所有数据
python sync_kingdee.py --mo           # 只同步工单
python sync_kingdee.py --material     # 只同步物料
"""

import requests
import json
import argparse
from datetime import datetime, timedelta
from config_sso import BASE_URL, DBID, USERNAME, APPID, APP_SECRET, LCID
from database import (
    init_db, upsert_material, upsert_customer, upsert_mo, 
    upsert_inventory, upsert_po, upsert_bom, log_sync
)


class KingdeeSync:
    """金蝶云数据同步"""
    
    def __init__(self):
        self.session = requests.Session()
        self.base_url = BASE_URL
        self.is_logged_in = False
    
    def login(self) -> bool:
        """WebAPI 登录"""
        if self.is_logged_in:
            return True
        
        login_url = f"{self.base_url}/Kingdee.BOS.WebApi.ServicesStub.AuthService.LoginByAppSecret.common.kdsvc"
        
        login_body = {
            "format": 1,
            "useragent": "ApiClient",
            "rid": "1",
            "parameters": json.dumps([DBID, USERNAME, APPID, APP_SECRET, LCID]),
            "timestamp": "0",
            "v": "1.0"
        }
        
        headers = {"Content-Type": "application/json"}
        
        try:
            response = self.session.post(login_url, headers=headers, data=json.dumps(login_body), timeout=30)
            response.raise_for_status()
            
            result = response.json()
            if result.get("LoginResultType") == 1:
                self.is_logged_in = True
                print(f"✅ 登录成功 - 用户: {result.get('Context', {}).get('UserName')}")
                return True
            else:
                print(f"❌ 登录失败: {result.get('Message', '未知错误')}")
                return False
        except Exception as e:
            print(f"❌ 登录异常: {e}")
            return False
    
    def query_entity(self, form_id: str, field_keys: str, filter_string: str = "", limit: int = 100) -> list:
        """查询实体数据"""
        query_url = f"{self.base_url}/Kingdee.BOS.WebApi.ServicesStub.DynamicFormService.ExecuteBillQuery.common.kdsvc"
        
        payload = {
            "data": {
                "FormId": form_id,
                "FieldKeys": field_keys,
                "FilterString": filter_string,
                "OrderString": "",
                "TopRowCount": 0,
                "StartRow": 0,
                "Limit": limit,
                "SubSystemId": ""
            }
        }
        
        headers = {"Content-Type": "application/json"}
        
        try:
            response = self.session.post(query_url, headers=headers, data=json.dumps(payload), timeout=60)
            response.raise_for_status()
            
            result = response.json()
            
            if isinstance(result, list):
                return result
            elif isinstance(result, dict) and "Result" in result:
                return result["Result"]
            else:
                return []
        except Exception as e:
            print(f"❌ 查询失败 ({form_id}): {e}")
            return []
    
    def sync_materials(self, limit: int = 500):
        """同步物料主数据"""
        print("\n📦 开始同步物料主数据...")
        
        field_keys = "FNumber,FName,FCategoryID.FName,FBaseUnitId.FName"
        
        rows = self.query_entity("BD_Material", field_keys, limit=limit)
        
        count = 0
        for row in rows:
            if not isinstance(row, list) or len(row) < 4:
                continue
            
            material = {
                'material_id': row[0] or f"MAT_{count}",
                'material_name': row[1] or '未知物料',
                'category': row[2] or '未分类',
                'unit': row[3] or 'PCS'
            }
            
            upsert_material(material)
            count += 1
        
        log_sync('materials', count, 'success')
        print(f"✅ 物料同步完成: {count} 条")
        return count
    
    def sync_customers(self, limit: int = 200):
        """同步客户主数据"""
        print("\n👥 开始同步客户主数据...")
        
        field_keys = "FNumber,FName"
        
        rows = self.query_entity("BD_Customer", field_keys, limit=limit)
        
        count = 0
        for row in rows:
            if not isinstance(row, list) or len(row) < 2:
                continue
            
            customer = {
                'customer_id': row[0] or f"CUST_{count}",
                'customer_name': row[1] or '未知客户',
                'tier': 'Tier 2'  # 默认
            }
            
            upsert_customer(customer)
            count += 1
        
        log_sync('customers', count, 'success')
        print(f"✅ 客户同步完成: {count} 条")
        return count
    
    def sync_manufacturing_orders(self, limit: int = 100):
        """同步工单"""
        print("\n🏭 开始同步工单...")
        
        # 最近 3 个月的工单
        three_months_ago = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
        filter_string = f"FDate >= '{three_months_ago}'"
        
        field_keys = "FBillNo,FSrcBillNo,FMaterialId.FNumber,FMaterialId.FName,FQty,FPlanFinishDate,FDocumentStatus"
        
        rows = self.query_entity("PRD_MO", field_keys, filter_string, limit)
        
        count = 0
        for row in rows:
            if not isinstance(row, list) or len(row) < 7:
                continue
            
            # 解析单据状态
            status_map = {'A': 'Plan', 'B': 'Released', 'C': 'InProgress', 'D': 'Completed', 'Z': 'Closed'}
            status = status_map.get(row[6], 'Plan')
            
            # 从物料编号中获取（如果有的话）
            material_id = row[2] or ''
            
            mo = {
                'mo_no': row[0],
                'so_no': row[1] or '',
                'material_id': material_id,
                'customer_id': '',  # 需要从销售订单关联
                'qty_plan': float(row[4]) if row[4] else 0,
                'status': status,
                'promise_date': row[5] or ''
            }
            
            upsert_mo(mo)
            count += 1
        
        log_sync('manufacturing_orders', count, 'success')
        print(f"✅ 工单同步完成: {count} 条")
        return count
    
    def sync_inventory(self, limit: int = 500):
        """同步库存"""
        print("\n📊 开始同步库存...")
        
        field_keys = "FMaterialId.FNumber,FBaseQty"
        
        rows = self.query_entity("STK_Inventory", field_keys, limit=limit)
        
        count = 0
        for row in rows:
            if not isinstance(row, list) or len(row) < 2:
                continue
            
            material_id = row[0] or ''
            qty = float(row[1]) if row[1] else 0
            
            if material_id:
                upsert_inventory(material_id, qty)
                count += 1
        
        log_sync('inventory', count, 'success')
        print(f"✅ 库存同步完成: {count} 条")
        return count
    
    def sync_purchase_orders(self, limit: int = 200):
        """同步采购订单"""
        print("\n🛒 开始同步采购订单...")
        
        # 最近 3 个月且未完成的采购订单
        three_months_ago = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
        filter_string = f"FDate >= '{three_months_ago}'"
        
        field_keys = "FBillNo,FMaterialId.FNumber,FQty,FDeliveryDate,FConfirmDate"
        
        rows = self.query_entity("PUR_PurchaseOrder", field_keys, filter_string, limit)
        
        count = 0
        for row in rows:
            if not isinstance(row, list) or len(row) < 5:
                continue
            
            po = {
                'po_no': row[0],
                'po_line_no': 1,
                'material_id': row[1] or '',
                'qty_ordered': float(row[2]) if row[2] else 0,
                'qty_remaining': float(row[2]) if row[2] else 0,
                'promised_date': row[3] or '',
                'is_confirmed': 1 if row[4] else 0
            }
            
            upsert_po(po)
            count += 1
        
        log_sync('purchase_orders', count, 'success')
        print(f"✅ 采购订单同步完成: {count} 条")
        return count
    
    def sync_bom(self, limit: int = 1000):
        """同步 BOM"""
        print("\n🔧 开始同步 BOM...")
        
        field_keys = "FMaterialId.FNumber,FChildMaterialId.FNumber,FBOMChildQty"
        
        rows = self.query_entity("PRD_PPBOM", field_keys, limit=limit)
        
        count = 0
        for row in rows:
            if not isinstance(row, list) or len(row) < 3:
                continue
            
            parent_id = row[0] or ''
            child_id = row[1] or ''
            qty = float(row[2]) if row[2] else 1.0
            
            if parent_id and child_id:
                upsert_bom(parent_id, child_id, qty)
                count += 1
        
        log_sync('bom', count, 'success')
        print(f"✅ BOM 同步完成: {count} 条")
        return count
    
    def sync_all(self):
        """同步所有数据"""
        if not self.login():
            print("❌ 登录失败，无法同步")
            return
        
        print("\n" + "="*60)
        print("🚀 开始全量数据同步")
        print("="*60)
        
        start_time = datetime.now()
        
        total = 0
        total += self.sync_materials()
        total += self.sync_customers()
        total += self.sync_manufacturing_orders()
        total += self.sync_inventory()
        total += self.sync_purchase_orders()
        total += self.sync_bom()
        
        duration = (datetime.now() - start_time).seconds
        
        print("\n" + "="*60)
        print(f"✅ 同步完成！")
        print(f"   总记录数: {total}")
        print(f"   耗时: {duration} 秒")
        print("="*60)


def main():
    parser = argparse.ArgumentParser(description='金蝶云数据同步')
    parser.add_argument('--all', action='store_true', help='同步所有数据')
    parser.add_argument('--material', action='store_true', help='同步物料')
    parser.add_argument('--customer', action='store_true', help='同步客户')
    parser.add_argument('--mo', action='store_true', help='同步工单')
    parser.add_argument('--inventory', action='store_true', help='同步库存')
    parser.add_argument('--po', action='store_true', help='同步采购订单')
    parser.add_argument('--bom', action='store_true', help='同步 BOM')
    parser.add_argument('--init-db', action='store_true', help='初始化数据库')
    
    args = parser.parse_args()
    
    # 初始化数据库（如果需要）
    if args.init_db:
        print("🔧 初始化数据库...")
        init_db()
        print("✅ 数据库初始化完成\n")
    
    syncer = KingdeeSync()
    
    if args.all or (not any([args.material, args.customer, args.mo, args.inventory, args.po, args.bom])):
        syncer.sync_all()
    else:
        if not syncer.login():
            print("❌ 登录失败")
            return
        
        if args.material:
            syncer.sync_materials()
        if args.customer:
            syncer.sync_customers()
        if args.mo:
            syncer.sync_manufacturing_orders()
        if args.inventory:
            syncer.sync_inventory()
        if args.po:
            syncer.sync_purchase_orders()
        if args.bom:
            syncer.sync_bom()


if __name__ == '__main__':
    main()

