<template>
  <el-dialog :title="isEdit ? '编辑图书' : '新增图书'" v-model="visible" width="520px" @close="onClose">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <el-form-item label="书名" prop="title">
        <el-input v-model="form.title" autocomplete="off" />
      </el-form-item>

      <el-form-item label="作者" prop="author">
        <el-input v-model="form.author" autocomplete="off" />
      </el-form-item>

      <!-- 价格输入项：修复注释格式，去掉错误注释 -->
      <el-form-item label="图书价格" prop="price">
        <el-input 
          v-model="form.price" 
          type="number" 
          step="0.01" 
          min="0" 
          autocomplete="off" 
          placeholder="请输入价格（元）"
          @input="handlePriceInput" 
        />
      </el-form-item>

      <el-form-item label="出版日期" prop="publish_date">
        <el-date-picker
          v-model="form.publish_date"
          type="date"
          placeholder="选择日期"
          style="width: 100%;"
        />
      </el-form-item>

      <el-form-item label="总数量" prop="total_count">
        <el-input-number v-model="form.total_count" :min="1" style="width:160px" />
      </el-form-item>

      <el-form-item label="状态（可选）" prop="status">
        <el-select v-model="form.status" placeholder="请选择">
          <el-option label="在馆" value="在馆" />
          <el-option label="借出" value="借出" />
        </el-select>
        <div style="font-size:12px;color:#999;margin-top:6px">
          提示：系统显示状态以「总数 / 可借」为准，此字段仅作备注。
        </div>
      </el-form-item>

      <el-form-item label="封面">
        <input type="file" accept="image/*" @change="onFileChange" />
        <div style="margin-top:8px; display:flex; gap:12px; align-items:center;">
          <div v-if="form.cover_preview">
            <div style="font-size:12px;color:#666;margin-bottom:6px">本地预览</div>
            <img :src="form.cover_preview" alt="封面预览" style="width:90px;height:120px;object-fit:cover;border-radius:4px" />
          </div>
          <div v-else-if="form.cover_url">
            <div style="font-size:12px;color:#666;margin-bottom:6px">当前封面</div>
            <img :src="fullCoverUrl(form.cover_url)" alt="当前封面" style="width:90px;height:120px;object-fit:cover;border-radius:4px" />
          </div>
          <div v-else style="color:#999">未选择封面</div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="onClose">取消</el-button>
      <el-button type="primary" @click="onSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

// props & emits
const props = defineProps({
  modelValue: Boolean,
  isEdit: Boolean,
  formData: Object
})
const emits = defineEmits(['update:modelValue', 'submit'])

// local refs
const visible = ref(props.modelValue)
const formRef = ref(null)

// 表单数据：price 初始为数字 0
const form = ref({
  id: null,
  title: '',
  author: '',
  price: 0,
  publish_date: '',
  total_count: 1,
  status: '',
  cover_url: null,
  coverFile: null,
  cover_preview: null
})

// 表单规则：修改 trigger 为 change，避免输入过程中误判
const rules = {
  title: [{ required: true, message: '请输入书名', trigger: 'blur' }],
  author: [{ required: true, message: '请输入作者', trigger: 'blur' }],
  price: [
    { required: true, message: '请输入价格', trigger: 'blur' },
    { type: 'number', min: 0, message: '价格不能为负数', trigger: 'change' } // 改为 change 触发
  ],
  publish_date: [{ required: true, message: '请选择出版日期', trigger: 'change' }],
  total_count: [{ required: true, message: '请输入总数量', trigger: 'change' }]
}

// watch modelValue -> visible
watch(() => props.modelValue, v => { visible.value = v })
// propagate visible -> update:modelValue
watch(visible, v => emits('update:modelValue', v))

// 监听 formData 变化，同步价格（确保为数字）
watch(() => props.formData, (val) => {
  if (form.value.cover_preview) {
    URL.revokeObjectURL(form.value.cover_preview)
  }

  if (val) {
    form.value = {
      ...val,
      price: typeof val.price === 'number' ? val.price : Number(val.price) || 0,
      coverFile: null,
      cover_preview: null
    }
  } else {
    form.value = {
      id: null,
      title: '',
      author: '',
      price: 0,
      publish_date: '',
      total_count: 1,
      status: '',
      cover_url: null,
      coverFile: null,
      cover_preview: null
    }
  }
}, { immediate: true })

// 注释掉这个 watch：避免和 handlePriceInput 冲突，导致价格反复重置
// watch(
//   () => form.value.price,
//   (val) => {
//     form.value.price = val === '' || val === null || isNaN(val) ? 0 : Number(val)
//   },
//   { immediate: true }
// )

// 释放 preview URL（组件卸载时）
onBeforeUnmount(() => {
  if (form.value.cover_preview) {
    URL.revokeObjectURL(form.value.cover_preview)
  }
})

// handlers
const onClose = () => {
  visible.value = false
}

const onFileChange = (e) => {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  if (form.value.cover_preview) {
    try { URL.revokeObjectURL(form.value.cover_preview) } catch(e){/* ignore */ }
  }
  form.value.coverFile = f
  form.value.cover_preview = URL.createObjectURL(f)
}

// 简化价格输入过滤：只保留核心转换，避免复杂逻辑冲突
const handlePriceInput = (val) => {
  // 处理空值和非数字，确保为有效数字
  if (val === '' || val === null || isNaN(Number(val))) {
    form.value.price = 0
  } else {
    form.value.price = Number(val)
  }
}

// submit: 提交前最终确认价格类型
const onSubmit = () => {
  // 强制转换为数字，双重保险
  form.value.price = Number(form.value.price) || 0
  formRef.value.validate(valid => {
    if (!valid) return
    const out = { ...form.value }
    if (out.publish_date instanceof Date) {
      out.publish_date = out.publish_date.toISOString().slice(0,10)
    }
    emits('submit', {
      id: out.id,
      title: out.title,
      author: out.author,
      price: out.price,
      publish_date: out.publish_date,
      total_count: out.total_count,
      status: out.status,
      cover_url: out.cover_url,
      coverFile: out.coverFile,
    })
    visible.value = false
  })
}

// helper: 拼接完整封面 URL
const fullCoverUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return window.location.origin + url
}
</script>