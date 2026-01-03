cd ./bmw-portal-project-management-dashboard
{
  echo "=========================================="
  echo "PROJE AĞAÇ YAPISI (node_modules hariç)"
  echo "=========================================="
  echo ""
  tree -I node_modules .
  echo ""
  
  echo "=========================================="
  echo "ROOT DIZIN DOSYALARI"
  echo "=========================================="
  echo ""
  for f in ./*; do
    if [ -f "$f" ]; then
      echo "FILE: $f"
      cat "$f"
      echo ""
      echo "------------------------------------------"
      echo ""
    fi
  done
  
  echo "=========================================="
  echo "SRC/ ALTINDAKI TÜM DOSYALAR"
  echo "=========================================="
  echo ""
  find src -type f 2>/dev/null | while read f; do
    echo "FILE: $f"
    cat "$f"
    echo ""
    echo "------------------------------------------"
    echo ""
  done
  
  echo "=========================================="
  echo "SERVER/ ALTINDAKI TÜM DOSYALAR"
  echo "=========================================="
  echo ""
  find server -type f 2>/dev/null | while read f; do
    echo "FILE: $f"
    cat "$f"
    echo ""
    echo "------------------------------------------"
    echo ""
  done
  
  echo "=========================================="
  echo "CONTEXTS/ ALTINDAKI TÜM DOSYALAR"
  echo "=========================================="
  echo ""
  find contexts -type f 2>/dev/null | while read f; do
    echo "FILE: $f"
    cat "$f"
    echo ""
    echo "------------------------------------------"
    echo ""
  done
  
  echo "=========================================="
  echo "COMPONENTS/ ALTINDAKI TÜM DOSYALAR"
  echo "=========================================="
  echo ""
  find components -type f 2>/dev/null | while read f; do
    echo "FILE: $f"
    cat "$f"
    echo ""
    echo "------------------------------------------"
    echo ""
  done

} > /Users/hknisci/full-project-dump.txt
cd ../
