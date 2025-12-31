
import { prisma } from "../src/plugins/prisma";
import { listWorkOrders } from "../src/modules/mes/work-order/service";

async function testSort() {
    console.log("Testing dueDate sort...");
    
    // Test ASC
    const resultAsc = await listWorkOrders(prisma, { 
        page: 1, 
        pageSize: 5, 
        sort: "dueDate.asc" 
    });
    console.log("ASC First 5 dueDates:", resultAsc.items.map(i => i.dueDate));

    // Test DESC
    const resultDesc = await listWorkOrders(prisma, { 
        page: 1, 
        pageSize: 5, 
        sort: "dueDate.desc" 
    });
    console.log("DESC First 5 dueDates:", resultDesc.items.map(i => i.dueDate));
}

testSort().catch(console.error).finally(() => prisma.$disconnect());
