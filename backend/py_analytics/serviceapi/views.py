from rest_framework.decorators import api_view
from rest_framework.response import Response
import math
@api_view(['POST'])
def ab_significance(request):
    a_success=int(request.data.get('a_success',0))
    a_total=int(request.data.get('a_total',1))
    b_success=int(request.data.get('b_success',0))
    b_total=int(request.data.get('b_total',1))
    pa=a_success/a_total
    pb=b_success/b_total
    p=(a_success+b_success)/(a_total+b_total)
    se=math.sqrt(p*(1-p)*(1/a_total+1/b_total))
    z=(pb-pa)/se if se>0 else 0
    return Response({'z':z,'p_value':2*(1-0.5*(1+math.erf(abs(z)/math.sqrt(2)))),'lift':pb-pa})
